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
    { id: 'theme', label: 'Themes & Styles', icon: '\uD83C\uDFA8' }
  ];

  var defaultData = {
    theme: { name: 'modern', layout: 'wide', heroStyle: 'centered' },
    site: { title: 'Teacher Portfolio' },
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
      el.textContent = 'Unsaved changes';
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
        updatePreview();
        alert('Data successfully loaded!');
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
    changed = false;
    updateSaveStatus();
  }

  function handleBuild() {
    handleDownload();
    alert('data.json downloaded successfully!\n\nTo build your live website package:\n1. Place `data.json` in your project root folder.\n2. Run `npm run build` in your terminal.\n3. Open `dist/index.html` to view your production website!');
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
      el.addEventListener('input', function () {
        onFieldChange(el);
        changed = true;
        updateSaveStatus();
        updatePreview();
      });
    });
    content.querySelectorAll('.btn-add').forEach(function (btn) {
      btn.addEventListener('click', function () { onAddClick(btn); });
    });
    content.querySelectorAll('.btn-remove').forEach(function (btn) {
      btn.addEventListener('click', function () { onRemoveClick(btn); });
    });
    content.querySelectorAll('.theme-card').forEach(function (card) {
      card.addEventListener('click', function () { onThemeSelect(card); });
    });
    content.querySelectorAll('input[name="layout"]').forEach(function (radio) {
      radio.addEventListener('change', function () { onLayoutChange(radio); });
    });
    content.querySelectorAll('input[name="heroStyle"]').forEach(function (radio) {
      radio.addEventListener('change', function () { onHeroStyleChange(radio); });
    });
  }

  function onFieldChange(el) {
    var path = el.dataset.path;
    if (!path) return;
    setPath(data, path, el.value);
    saveData(data);
  }

  function onAddClick(btn) {
    var type = btn.dataset.add;
    var path = btn.dataset.path;
    if (!data.theme) data.theme = { name: 'modern', layout: 'wide', heroStyle: 'centered' };
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
    updatePreview();
  }

  function onRemoveClick(btn) {
    var path = btn.dataset.path;
    var idx = parseInt(btn.dataset.index);
    var arr = getPath(data, path);
    if (arr && idx >= 0 && idx < arr.length) {
      arr.splice(idx, 1);
      saveData(data);
      render();
      updatePreview();
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
        '<div class="form-group"><label>Website / Portfolio Title</label>' + inputHTML('site.title', data.site.title, 'Your name or site title') + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderHero() {
    return '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Hero Section</div>' +
        '<div class="form-group"><label>Tagline / Subtitle</label>' + inputHTML('hero.tagline', data.hero.tagline, 'Welcome to My Teaching Portfolio') + '</div>' +
        '<div class="form-group"><label>Main Hero Title</label>' + inputHTML('hero.title', data.hero.title, 'Empowering Every Learner') + '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Highlighted Word</label>' + inputHTML('hero.highlight', data.hero.highlight, 'Every Learner') + '</div>' +
          '<div class="form-group"><label>Avatar Initials</label>' + inputHTML('hero.initials', data.hero.initials, 'TP') + '</div>' +
        '</div>' +
        '<div class="form-group"><label>Hero Description</label>' + textareaHTML('hero.description', data.hero.description, 'Describe your teaching passion...') + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderAbout() {
    var html = '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">About Me</div>' +
        '<div class="form-group"><label>Lead Paragraph</label>' + textareaHTML('about.lead', data.about.lead, 'Bio lead sentence...') + '</div>';

    data.about.paragraphs.forEach(function (p, i) {
      html += '<div class="form-group"><label>Paragraph ' + (i + 1) + '</label>' + textareaHTML('about.paragraphs.' + i, p, 'Paragraph ' + (i + 1)) + '<div style="margin-top:6px;text-align:right"><button type="button" class="btn btn-sm btn-remove" data-path="about.paragraphs" data-index="' + i + '">Remove Paragraph</button></div></div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline btn-add" data-add="paragraph" data-path="about.paragraphs">+ Add Paragraph</button></div>';

    html += '<div class="cms-section__title" style="margin-top:24px">Key Statistics</div>';

    data.about.stats.forEach(function (s, i) {
      html += '<div class="list-row">' +
        '<input type="text" data-path="about.stats.' + i + '.number" value="' + escAttr(s.number) + '" placeholder="Number" style="flex:0 0 90px" title="Number">' +
        '<input type="text" data-path="about.stats.' + i + '.suffix" value="' + escAttr(s.suffix) + '" placeholder="Suffix (+)" style="flex:0 0 80px" title="Suffix">' +
        '<input type="text" data-path="about.stats.' + i + '.label" value="' + escAttr(s.label) + '" placeholder="Label" title="Label">' +
        '<button type="button" class="btn-remove" data-path="about.stats" data-index="' + i + '">&times;</button>' +
        '</div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline btn-add" data-add="stat" data-path="about.stats">+ Add Stat</button></div>';
    html += '</div></div>';
    return html;
  }

  function renderCourses() {
    var html = '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Courses Taught</div>';

    data.courses.forEach(function (c, i) {
      html += '<div class="cms-card">' +
        '<div class="cms-card__header">' +
          '<span class="cms-card__title">Course ' + (i + 1) + '</span>' +
          '<button type="button" class="btn btn-sm btn-remove" data-path="courses" data-index="' + i + '">Remove</button>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Icon (Emoji)</label>' + inputHTML('courses.' + i + '.icon', c.icon, '\uD83D\uDCD6') + '</div>' +
          '<div class="form-group"><label>Grade / Level</label>' + inputHTML('courses.' + i + '.level', c.level, 'All Grades') + '</div>' +
        '</div>' +
        '<div class="form-group"><label>Course Title</label>' + inputHTML('courses.' + i + '.title', c.title, 'Course Title') + '</div>' +
        '<div class="form-group"><label>Description</label>' + textareaHTML('courses.' + i + '.description', c.description, 'Course description...') + '</div>' +
      '</div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline btn-add" data-add="course" data-path="courses">+ Add Course</button></div>';
    html += '</div></div>';
    return html;
  }

  function renderPhilosophy() {
    var html = '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Teaching Philosophy Quote</div>' +
        '<div class="form-group"><label>Quote</label>' + textareaHTML('philosophy.quote', data.philosophy.quote, 'Your teaching philosophy quote...') + '</div>' +
        '<div class="form-group"><label>Attribution</label>' + inputHTML('philosophy.attribution', data.philosophy.attribution, '\u2014 Author Name') + '</div>' +
      '</div>' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Core Teaching Principles</div>';

    data.philosophy.points.forEach(function (p, i) {
      html += '<div class="cms-card">' +
        '<div class="cms-card__header">' +
          '<span class="cms-card__title">Principle ' + (i + 1) + '</span>' +
          '<button type="button" class="btn btn-sm btn-remove" data-path="philosophy.points" data-index="' + i + '">Remove</button>' +
        '</div>' +
        '<div class="form-group"><label>Title</label>' + inputHTML('philosophy.points.' + i + '.title', p.title, 'Point title') + '</div>' +
        '<div class="form-group"><label>Description</label>' + textareaHTML('philosophy.points.' + i + '.description', p.description, 'Point description...') + '</div>' +
      '</div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline btn-add" data-add="point" data-path="philosophy.points">+ Add Principle</button></div>';
    html += '</div></div>';
    return html;
  }

  function renderAchievements() {
    var html = '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Achievements &amp; Recognition</div>';

    data.achievements.forEach(function (a, i) {
      html += '<div class="cms-card">' +
        '<div class="cms-card__header">' +
          '<span class="cms-card__title">Achievement ' + (i + 1) + '</span>' +
          '<button type="button" class="btn btn-sm btn-remove" data-path="achievements" data-index="' + i + '">Remove</button>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Year</label>' + inputHTML('achievements.' + i + '.year', a.year, '2024') + '</div>' +
          '<div class="form-group"><label>Title</label>' + inputHTML('achievements.' + i + '.title', a.title, 'Achievement Title') + '</div>' +
        '</div>' +
        '<div class="form-group"><label>Description</label>' + textareaHTML('achievements.' + i + '.description', a.description, 'Description...') + '</div>' +
      '</div>';
    });

    html += '<div class="cms-data-actions"><button type="button" class="btn btn--sm btn--outline btn-add" data-add="achievement" data-path="achievements">+ Add Achievement</button></div>';
    html += '</div></div>';
    return html;
  }

  function renderContact() {
    return '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Contact Information</div>' +
        '<div class="form-group"><label>Email Address</label>' + inputHTML('contact.email', data.contact.email, 'teacher@example.com') + '</div>' +
        '<div class="form-group"><label>Phone Number</label>' + inputHTML('contact.phone', data.contact.phone, '+1 (555) 123-4567') + '</div>' +
        '<div class="form-group"><label>Location / School</label>' + inputHTML('contact.location', data.contact.location, 'City, State / Country') + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderTheme() {
    var themesList = [
      { id: 'modern', label: 'Modern', primary: '#4f46e5', accent: '#059669', desc: 'Indigo & Emerald' },
      { id: 'warm', label: 'Warm', primary: '#d97706', accent: '#b45309', desc: 'Amber & Gold' },
      { id: 'academic', label: 'Academic', primary: '#1e3a8a', accent: '#1e40af', desc: 'Classic Navy' },
      { id: 'creative', label: 'Creative', primary: '#db2777', accent: '#c026d3', desc: 'Bold Pink & Magenta' },
      { id: 'minimal', label: 'Minimal', primary: '#0f172a', accent: '#334155', desc: 'Sleek Charcoal' },
      { id: 'emerald', label: 'Emerald', primary: '#047857', accent: '#059669', desc: 'Forest Green' },
      { id: 'sunset', label: 'Sunset', primary: '#ea580c', accent: '#7c3aed', desc: 'Coral & Violet' },
      { id: 'cyber', label: 'Cyber STEM', primary: '#0284c7', accent: '#0891b2', desc: 'Cyan & Tech Slate' }
    ];

    if (!data.theme) data.theme = { name: 'modern', layout: 'wide', heroStyle: 'centered' };
    var current = data.theme.name || 'modern';
    var themeCards = themesList.map(function (t) {
      var activeClass = t.id === current ? ' active' : '';
      return '<div class="theme-card' + activeClass + '" data-theme="' + t.id + '" data-primary="' + t.primary + '" data-accent="' + t.accent + '">' +
        '<div class="theme-card__swatch"><div style="background:' + t.primary + ';width:24px;height:24px;border-radius:50%;display:inline-block"></div><div style="background:' + t.accent + ';width:24px;height:24px;border-radius:50%;display:inline-block"></div></div>' +
        '<div class="theme-card__info"><strong>' + t.label + '</strong><span style="font-size:0.75rem;color:#64748b">' + t.desc + '</span></div>' +
        '</div>';
    }).join('');

    var layouts = ['wide', 'boxed', 'full'];
    var layoutRadios = layouts.map(function (l) {
      var checked = (data.theme.layout || 'wide') === l ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="layout" value="' + l + '"' + checked + '>' + l.charAt(0).toUpperCase() + l.slice(1) + '</label>';
    }).join('');

    var heroStyles = ['centered', 'split', 'left'];
    var heroRadios = heroStyles.map(function (s) {
      var checked = (data.theme.heroStyle || 'centered') === s ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="heroStyle" value="' + s + '"' + checked + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</label>';
    }).join('');

    return '<div class="cms-panel">' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Professional Design Themes (8 Options)</div>' +
        '<p style="font-size:0.85rem;color:#64748b;margin-bottom:16px">Click any theme preset to instantly apply its color palette and typography.</p>' +
        '<div class="theme-selector" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px">' + themeCards + '</div>' +
      '</div>' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Page Layout Width</div>' +
        '<div class="form-row" style="display:flex;gap:24px;margin-bottom:24px">' + layoutRadios + '</div>' +
      '</div>' +
      '<div class="cms-section">' +
        '<div class="cms-section__title">Hero Alignment</div>' +
        '<div class="form-row" style="display:flex;gap:24px;margin-bottom:24px">' + heroRadios + '</div>' +
      '</div>' +
    '</div>';
  }

  function updatePreview() {
    var frame = document.getElementById('previewFrame');
    if (!frame || !previewOpen) return;
    try {
      var html = generatePreviewHTML();
      if ('srcdoc' in frame) {
        frame.srcdoc = html;
      } else {
        var doc = frame.contentDocument || frame.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
      }
    } catch (err) {
      console.error('Preview render error:', err);
    }
  }

  var THEMES = {
    modern: { primary: '#4f46e5', accent: '#059669' },
    warm: { primary: '#d97706', accent: '#b45309' },
    academic: { primary: '#1e3a8a', accent: '#1e40af' },
    creative: { primary: '#db2777', accent: '#c026d3' },
    minimal: { primary: '#0f172a', accent: '#334155' },
    emerald: { primary: '#047857', accent: '#059669' },
    sunset: { primary: '#ea580c', accent: '#7c3aed' },
    cyber: { primary: '#0284c7', accent: '#0891b2' }
  };

  function generatePreviewHTML() {
    if (!data.theme) data.theme = { name: 'modern', layout: 'wide', heroStyle: 'centered' };
    var theme = THEMES[data.theme.name] || THEMES.modern;
    var primary = theme.primary;
    var accent = theme.accent;

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
      return '<div style="text-align:center"><strong style="font-size:1.4rem;color:' + primary + ';display:block">' + escHtml(st.number) + (st.suffix || '') + '</strong><span style="color:#64748b;font-size:0.75rem">' + escHtml(st.label || '') + '</span></div>';
    }).join('');

    var coursesHtml = (data.courses || []).map(function (co) {
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:10px">' +
        '<div style="font-size:1.2rem;margin-bottom:6px">' + escHtml(co.icon || '') + '</div>' +
        '<strong style="font-size:0.9rem">' + escHtml(co.title || '') + '</strong>' +
        '<p style="font-size:0.75rem;color:#64748b;margin:4px 0">' + escHtml(co.description || '') + '</p>' +
        '<span style="font-size:0.65rem;background:' + rgba(accent, 0.12) + ';color:' + accent + ';padding:2px 8px;border-radius:999px">' + escHtml(co.level || '') + '</span>' +
        '</div>';
    }).join('');

    var pointsHtml = (p.points || []).map(function (pt) {
      return '<div style="background:#fff;padding:14px;border-radius:8px;border:1px solid #e2e8f0"><strong style="font-size:0.85rem">' + escHtml(pt.title || '') + '</strong><p style="font-size:0.75rem;color:#64748b;margin-top:4px">' + escHtml(pt.description || '') + '</p></div>';
    }).join('');

    var achievementsHtml = (data.achievements || []).map(function (ach) {
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:10px">' +
        '<span style="font-size:0.65rem;background:' + rgba(primary, 0.12) + ';color:' + primary + ';padding:2px 8px;border-radius:999px;font-weight:700">' + escHtml(ach.year || '') + '</span>' +
        '<strong style="font-size:0.85rem;display:block;margin-top:4px">' + escHtml(ach.title || '') + '</strong>' +
        '<p style="font-size:0.75rem;color:#64748b;margin-top:2px">' + escHtml(ach.description || '') + '</p>' +
        '</div>';
    }).join('');

    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>' +
      ':root{--color-primary:' + primary + ';--color-accent:' + accent + ';}' +
      'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1e293b;line-height:1.6;margin:0;padding:0;background:#f8fafc}' +
      '.container{max-width:900px;margin:0 auto;padding:0 20px}' +
      '.header{background:#ffffff;border-bottom:1px solid #e2e8f0;padding:14px 0;position:sticky;top:0;z-index:10}' +
      '.logo{font-weight:800;font-size:1.1rem;color:' + primary + ';text-decoration:none}' +
      '.hero{padding:40px 0;background:linear-gradient(135deg,' + rgba(primary, 0.05) + ' 0%,#ffffff 100%);text-align:' + (data.theme.heroStyle || 'centered') + '}' +
      '.hero__title{font-size:1.8rem;font-weight:800;margin-bottom:10px;color:#0f172a}' +
      '.highlight{color:' + primary + '}' +
      '.hero__desc{font-size:0.9rem;color:#64748b;max-width:500px;' + ((data.theme.heroStyle || 'centered') === 'centered' ? 'margin:0 auto' : '') + '}' +
      '.section{padding:30px 0}' +
      '.section__title{font-size:1.25rem;font-weight:700;margin-bottom:16px;color:#0f172a;text-align:center}' +
      '.stats{display:flex;justify-content:space-around;background:#ffffff;padding:16px;border-radius:10px;border:1px solid #e2e8f0;margin-top:16px}' +
      '</style></head><body>' +
      '<div class="header"><div class="container"><a href="#" class="logo">' + escHtml(s.title || 'Portfolio') + '</a></div></div>' +
      '<main>' +
      '<section class="hero"><div class="container"><span style="font-size:0.7rem;font-weight:700;color:' + primary + ';text-transform:uppercase;letter-spacing:0.1em">' + escHtml(h.tagline || '') + '</span>' +
      '<h1 class="hero__title">Empowering <span class="highlight">' + escHtml(h.highlight || 'Every Learner') + '</span></h1>' +
      '<p class="hero__desc">' + escHtml(h.description || '') + '</p></div></section>' +
      '<section class="section"><div class="container"><h2 class="section__title">About Me</h2>' +
      '<p style="font-size:0.85rem;color:#475569">' + escHtml(a.lead || '') + '</p>' +
      '<div class="stats">' + statsHtml + '</div></div></section>' +
      '<section class="section" style="background:#edf2f7"><div class="container"><h2 class="section__title">Courses</h2>' + coursesHtml + '</div></section>' +
      '<section class="section"><div class="container"><h2 class="section__title">Teaching Philosophy</h2>' +
      '<div style="background:#fff;padding:16px;border-left:4px solid ' + primary + ';border-radius:0 8px 8px 0;font-style:italic;font-size:0.85rem;margin-bottom:16px">"' + escHtml(p.quote || '') + '"</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + pointsHtml + '</div></div></section>' +
      '<section class="section" style="background:#edf2f7"><div class="container"><h2 class="section__title">Achievements</h2>' + achievementsHtml + '</div></section>' +
      '<section class="section"><div class="container"><h2 class="section__title">Get in Touch</h2><p style="font-size:0.8rem;text-align:center;color:#64748b">' + escHtml(c.email || '') + ' &bull; ' + escHtml(c.phone || '') + '</p></div></section>' +
      '</main></body></html>';
  }

  function darkenHex(hex) {
    var r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
    var g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
    var b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function onThemeSelect(card) {
    var themeId = card.dataset.theme;
    var primary = card.dataset.primary;
    var accent = card.dataset.accent;
    if (!data.theme) data.theme = {};
    data.theme.name = themeId;
    saveData(data);
    render();
    updatePreview();
  }

  function onLayoutChange(radio) {
    if (!data.theme) data.theme = {};
    data.theme.layout = radio.value;
    saveData(data);
    render();
    updatePreview();
  }

  function onHeroStyleChange(radio) {
    if (!data.theme) data.theme = {};
    data.theme.heroStyle = radio.value;
    saveData(data);
    render();
    updatePreview();
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
