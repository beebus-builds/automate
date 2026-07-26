(function () {
  var STORAGE_KEY = 'teacher_portfolio_cms';
  var HISTORY_KEY = STORAGE_KEY + '_history';
  var MEDIA_KEY = STORAGE_KEY + '_media';
  var previewOpen = true;
  var currentDevice = 'desktop';

  var tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '\uD83C\uDFE0' },
    { id: 'general', label: 'General', icon: '\u2699' },
    { id: 'hero', label: 'Hero', icon: '\u2728' },
    { id: 'about', label: 'About', icon: '\uD83D\uDC64' },
    { id: 'courses', label: 'Courses', icon: '\uD83D\uDCD6' },
    { id: 'philosophy', label: 'Philosophy', icon: '\u270D' },
    { id: 'achievements', label: 'Achievements', icon: '\u2B50' },
    { id: 'contact', label: 'Contact', icon: '\uD83D\uDCE7' },
    { id: 'seo', label: 'SEO & Settings', icon: '\uD83D\uDD0D' },
    { id: 'media', label: 'Media', icon: '\uD83D\uDDBC' },
    { id: 'theme', label: 'Themes & Style', icon: '\uD83C\uDFA8' }
  ];

  var defaultData = {
    theme: { name: 'modern', layout: 'wide', heroStyle: 'centered' },
    site: { title: 'Teacher Portfolio' },
    seo: { metaTitle: '', metaDesc: '', ogImage: '', googleAnalytics: '' },
    hero: { tagline: 'Welcome to My Teaching Portfolio', title: 'Empowering Every Learner', highlight: 'Every Learner', description: 'Dedicated to creating engaging learning experiences.', initials: 'TP', heroImage: '' },
    about: { lead: 'Hello! I am a dedicated educator with over 10 years of experience.', paragraphs: ['My teaching journey has taken me through multiple subjects and grade levels.', 'I believe every student has unique potential.'], stats: [{ number: '10', suffix: '+', label: 'Years Experience' }, { number: '500', suffix: '+', label: 'Students Mentored' }, { number: '3', suffix: '', label: 'Subject Specializations' }] },
    courses: [{ icon: '\uD83D\uDCD6', title: 'Mathematics', description: 'From algebra to calculus, building strong foundations.', level: 'Grades 9-12' }, { icon: '\uD83D\uDD2C', title: 'Science', description: 'Hands-on experiments and inquiry-based learning.', level: 'Grades 7-10' }, { icon: '\u26A1', title: 'Physics', description: 'Real-world applications and interactive demonstrations.', level: 'Grades 11-12' }, { icon: '\uD83D\uDCBB', title: 'Computer Science', description: 'Programming, algorithms, and computational thinking.', level: 'Grades 9-12' }],
    philosophy: { quote: 'Education is not the filling of a pail, but the lighting of a fire.', attribution: '\u2014 William Butler Yeats', points: [{ title: 'Student-Centered', description: 'Focusing on individual needs while fostering independence.' }, { title: 'Inclusive Classroom', description: 'Creating a safe environment where all students feel valued.' }, { title: 'Real-World Connections', description: 'Linking curriculum to real-life applications.' }, { title: 'Continuous Growth', description: 'Embracing lifelong learning and adapting methods.' }] },
    achievements: [{ year: '2023', title: 'Distinguished Teacher Award', description: 'Recognized for outstanding contributions.' }, { year: '2022', title: 'Curriculum Development Lead', description: 'Led development of a new STEM curriculum.' }, { year: '2021', title: 'Mentorship Excellence', description: 'Awarded for mentoring underprivileged students.' }],
    contact: { email: 'teacher@example.com', phone: '+1 (555) 123-4567', location: 'City, State / Country' }
  };

  var data = null;
  var changed = false;

  function getData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
  }

  function saveData(d, skipHistory) {
    data = d;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    if (!skipHistory) pushHistory(d);
    changed = true;
    updateSaveStatus();
  }

  function pushHistory(d) {
    try {
      var hist = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
      hist.push(JSON.parse(JSON.stringify(d)));
      if (hist.length > 20) hist.shift();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    } catch (e) {}
  }

  function undoLast() {
    try {
      var hist = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
      if (hist.length < 2) { showToast('Nothing to undo'); return; }
      hist.pop();
      var prev = hist[hist.length - 1];
      saveData(JSON.parse(JSON.stringify(prev)), true);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
      render();
      updatePreview();
      showToast('Undone successfully');
    } catch (e) { showToast('Undo failed'); }
  }

  function updateSaveStatus() {
    var el = document.getElementById('saveStatus');
    if (!el) return;
    el.textContent = changed ? 'Unsaved changes' : 'Saved';
    el.className = 'cms-status ' + (changed ? 'cms-status--unsaved' : 'cms-status--saved');
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast toast--visible';
    clearTimeout(t._hide);
    t._hide = setTimeout(function () { t.className = 'toast'; }, 3000);
  }

  function loadFile() { document.getElementById('fileInput').click(); }

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
        showToast('Data loaded successfully!');
      } catch (err) { showToast('Invalid JSON file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleDownload() {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'data.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    changed = false;
    updateSaveStatus();
    showToast('data.json downloaded');
  }

  function handleBuild() {
    handleDownload();
    showToast('Downloaded! Place data.json in project root and run npm run build');
  }

  function renderSidebar() {
    var nav = document.getElementById('sidebarNav');
    nav.innerHTML = tabs.map(function (t) {
      return '<div class="cms__nav-item' + (t.id === getCurrentTab() ? ' active' : '') + '" data-tab="' + t.id + '"><span class="cms__nav-icon">' + t.icon + '</span><span>' + t.label + '</span></div>';
    }).join('');
    nav.querySelectorAll('.cms__nav-item').forEach(function (item) {
      item.addEventListener('click', function () { switchTab(item.dataset.tab); });
    });
  }

  function getCurrentTab() {
    var active = document.querySelector('.cms__nav-item.active');
    return active ? active.dataset.tab : 'dashboard';
  }

  function switchTab(tabId) {
    document.querySelectorAll('.cms__nav-item').forEach(function (n) {
      n.classList.toggle('active', n.dataset.tab === tabId);
    });
    document.querySelectorAll('.cms__tab').forEach(function (t) {
      t.classList.toggle('active', t.id === 'tab-' + tabId);
    });
    var found = tabs.find(function (t) { return t.id === tabId; });
    document.getElementById('topbarTitle').textContent = found ? found.label : '';
    render();
    updatePreview();
  }

  function render() {
    renderSidebar();
    var content = document.getElementById('cmsContent');
    var tab = getCurrentTab();
    var html = '<div class="cms-tab active" id="tab-' + tab + '">';
    switch (tab) {
      case 'dashboard': html += renderDashboard(); break;
      case 'general': html += renderGeneral(); break;
      case 'hero': html += renderHero(); break;
      case 'about': html += renderAbout(); break;
      case 'courses': html += renderCourses(); break;
      case 'philosophy': html += renderPhilosophy(); break;
      case 'achievements': html += renderAchievements(); break;
      case 'contact': html += renderContact(); break;
      case 'seo': html += renderSEO(); break;
      case 'media': html += renderMedia(); break;
      case 'theme': html += renderTheme(); break;
    }
    html += '</div>';
    content.innerHTML = html;

    content.querySelectorAll('input, textarea, select').forEach(function (el) {
      el.addEventListener('input', function () { if (el.dataset.path) { setPath(data, el.dataset.path, el.value); saveData(data); updatePreview(); } });
    });
    content.querySelectorAll('.btn-add').forEach(function (btn) { btn.addEventListener('click', function () { onAddClick(btn); }); });
    content.querySelectorAll('.btn-remove').forEach(function (btn) { btn.addEventListener('click', function () { onRemoveClick(btn); }); });
    content.querySelectorAll('.theme-card').forEach(function (card) { card.addEventListener('click', function () { onThemeSelect(card); }); });
    content.querySelectorAll('input[name="layout"]').forEach(function (r) { r.addEventListener('change', function () { onLayoutChange(r); }); });
    content.querySelectorAll('input[name="heroStyle"]').forEach(function (r) { r.addEventListener('change', function () { onHeroStyleChange(r); }); });
    content.querySelectorAll('#fontPair').forEach(function (sel) { sel.addEventListener('change', function () { onStyleChange('fontPair', sel.value); }); });
    content.querySelectorAll('input[name="roundness"]').forEach(function (r) { r.addEventListener('change', function () { onStyleChange('roundness', r.value); }); });
    content.querySelectorAll('input[name="shadowDepth"]').forEach(function (r) { r.addEventListener('change', function () { onStyleChange('shadowDepth', r.value); }); });
    content.querySelectorAll('input[name="spacing"]').forEach(function (r) { r.addEventListener('change', function () { onStyleChange('spacing', r.value); }); });
    content.querySelectorAll('input[name="buttonStyle"]').forEach(function (r) { r.addEventListener('change', function () { onStyleChange('buttonStyle', r.value); }); });
    content.querySelectorAll('input[name="sectionStyle"]').forEach(function (r) { r.addEventListener('change', function () { onStyleChange('sectionStyle', r.value); }); });
    content.querySelectorAll('#headerFixed').forEach(function (chk) { chk.addEventListener('change', function () { onStyleChange('headerFixed', chk.checked); }); });
    content.querySelectorAll('.quick-action').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); switchTab(a.dataset.tab); }); });
    content.querySelectorAll('.media-item').forEach(function (item) { item.addEventListener('click', function () { selectMedia(item); }); });
    content.querySelectorAll('.nav-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        content.querySelectorAll('.nav-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        content.querySelectorAll('.nav-panel').forEach(function (p) { p.style.display = 'none'; });
        var panel = document.getElementById(btn.dataset.panel);
        if (panel) panel.style.display = 'block';
      });
    });
  }

  function onThemeSelect(card) {
    if (!data.theme) data.theme = {};
    data.theme.name = card.dataset.theme;
    saveData(data);
    render();
    updatePreview();
    showToast('Theme: ' + card.dataset.theme);
  }

  function onLayoutChange(radio) {
    if (!data.theme) data.theme = {};
    data.theme.layout = radio.value;
    saveData(data);
    updatePreview();
  }

  function onHeroStyleChange(radio) {
    if (!data.theme) data.theme = {};
    data.theme.heroStyle = radio.value;
    saveData(data);
    updatePreview();
  }

  function onStyleChange(key, value) {
    if (!data.style) data.style = {};
    data.style[key] = value;
    saveData(data);
    updatePreview();
  }

  function onAddClick(btn) {
    var type = btn.dataset.add;
    var path = btn.dataset.path;
    var arr = getPath(data, path);
    if (!arr) return;
    if (type === 'course') arr.push({ icon: '\uD83D\uDCD6', title: '', description: '', level: '' });
    else if (type === 'achievement') arr.push({ year: '', title: '', description: '' });
    else if (type === 'point') arr.push({ title: '', description: '' });
    else if (type === 'stat') arr.push({ number: '', suffix: '', label: '' });
    else if (type === 'paragraph') arr.push('');
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
    var parts = path.split('.'); var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) { if (!cur[parts[i]]) return undefined; cur = cur[parts[i]]; }
    return cur[parts[parts.length - 1]];
  }

  function setPath(obj, path, value) {
    var parts = path.split('.'); var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) { if (!cur[parts[i]]) cur[parts[i]] = {}; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = value;
  }

  function inp(path, val, ph) { return '<input type="text" data-path="' + path + '" value="' + escAttr(val) + '" placeholder="' + escAttr(ph || '') + '">'; }
  function inpN(path, val, ph) { return '<input type="number" data-path="' + path + '" value="' + escAttr(val) + '" placeholder="' + escAttr(ph || '') + '">'; }
  function ta(path, val, ph) { return '<textarea data-path="' + path + '" placeholder="' + escAttr(ph || '') + '">' + escHtml(val || '') + '</textarea>'; }
  function escHtml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderDashboard() {
    var c = (data.courses || []).length;
    var a = (data.achievements || []).length;
    var p = (data.philosophy.points || []).length;
    var st = (data.about.stats || []).length;

    return '<div class="dashboard">' +
      '<div class="dashboard__header"><h2>Dashboard</h2><p>Welcome to your Portfolio CMS. Manage all your content from here.</p></div>' +
      '<div class="dashboard__stats">' +
        '<div class="stat-card"><div class="stat-card__icon stat-card__icon--primary"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div><div><span class="stat-card__value">' + c + '</span><span class="stat-card__label">Courses</span></div></div>' +
        '<div class="stat-card"><div class="stat-card__icon stat-card__icon--accent"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg></div><div><span class="stat-card__value">' + a + '</span><span class="stat-card__label">Achievements</span></div></div>' +
        '<div class="stat-card"><div class="stat-card__icon stat-card__icon--purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div><div><span class="stat-card__value">' + p + '</span><span class="stat-card__label">Principles</span></div></div>' +
        '<div class="stat-card"><div class="stat-card__icon stat-card__icon--amber"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div><div><span class="stat-card__value">' + st + '</span><span class="stat-card__label">Statistics</span></div></div>' +
      '</div>' +
      '<div class="dashboard__grid"><div class="dashboard__card"><h3>Quick Actions</h3><div class="dashboard__quick-actions">' +
        '<a href="#" class="quick-action" data-tab="general"><span class="quick-action__icon">\u2699</span><div class="quick-action__text"><strong>Site Settings</strong><span>Edit site title and global settings</span></div></a>' +
        '<a href="#" class="quick-action" data-tab="hero"><span class="quick-action__icon">\u2728</span><div class="quick-action__text"><strong>Hero Section</strong><span>Tagline, title, description</span></div></a>' +
        '<a href="#" class="quick-action" data-tab="about"><span class="quick-action__icon">\uD83D\uDC64</span><div class="quick-action__text"><strong>About Page</strong><span>Bio, paragraphs, stats</span></div></a>' +
        '<a href="#" class="quick-action" data-tab="courses"><span class="quick-action__icon">\uD83D\uDCD6</span><div class="quick-action__text"><strong>Manage Courses</strong><span>Add, edit, or remove courses</span></div></a>' +
        '<a href="#" class="quick-action" data-tab="media"><span class="quick-action__icon">\uD83D\uDDBC</span><div class="quick-action__text"><strong>Media Library</strong><span>Upload and manage images</span></div></a>' +
        '<a href="#" class="quick-action" data-tab="seo"><span class="quick-action__icon">\uD83D\uDD0D</span><div class="quick-action__text"><strong>SEO Settings</strong><span>Meta tags and analytics</span></div></a>' +
        '<a href="#" class="quick-action" data-tab="theme"><span class="quick-action__icon">\uD83C\uDFA8</span><div class="quick-action__text"><strong>Theme Options</strong><span>Colors, layout, hero style</span></div></a>' +
      '</div></div><div class="dashboard__card"><h3>Getting Started</h3>' +
      '<div style="font-size:.85rem;color:#475569;line-height:1.8"><p style="margin-bottom:12px">Follow these steps to build your portfolio:</p>' +
      '<ol style="padding-left:18px"><li>Edit your <strong>Hero</strong> and <strong>About</strong> sections</li><li>Add courses and achievements</li><li>Pick a <strong>Theme</strong> you like</li><li>Download JSON and run <code>npm run build</code></li></ol>' +
      '<div style="margin-top:16px;padding:12px;background:#f1f5f9;border-radius:6px"><strong style="font-size:.8rem">\uD83D\uDCA1 Tip:</strong><p style="font-size:.78rem;color:#64748b">Use the <strong>Undo</strong> button in the toolbar if you make a mistake.</p></div></div></div></div></div>';
  }

  function renderGeneral() {
    return '<div class="cms-panel"><div class="cms-panel__header"><h2>General Settings</h2><p>Global site configuration.</p></div>' +
      '<div class="cms-section"><div class="cms-section__title">Site Settings</div>' +
      '<div class="form-group"><label>Site Title</label>' + inp('site.title', data.site.title, 'Your site title') + '<p class="help-text">This appears in the browser tab and site header.</p></div></div></div>';
  }

  function renderHero() {
    return '<div class="cms-panel"><div class="cms-panel__header"><h2>Hero Section</h2><p>The first thing visitors see. Make a strong impression.</p></div>' +
      '<div class="cms-section"><div class="cms-section__title">Content</div>' +
      '<div class="form-group"><label>Tagline <span style="color:#64748b;font-weight:400">(small text above title)</span></label>' + inp('hero.tagline', data.hero.tagline, 'Welcome to My Teaching Portfolio') + '</div>' +
      '<div class="form-group"><label>Hero Title</label>' + inp('hero.title', data.hero.title, 'Empowering Every Learner') + '</div>' +
      '<div class="form-row"><div class="form-group"><label>Highlighted Word</label>' + inp('hero.highlight', data.hero.highlight, 'Every Learner') + '</div>' +
      '<div class="form-group"><label>Avatar Initials</label>' + inp('hero.initials', data.hero.initials, 'TP') + '</div></div>' +
      '<div class="form-group"><label>Description</label>' + ta('hero.description', data.hero.description, 'Describe your teaching passion...') + '</div>' +
      '<div class="form-group"><label>Hero Image URL (optional)</label>' + inp('hero.heroImage', data.hero.heroImage || '', 'https://example.com/photo.jpg') + '<p class="help-text">Leave blank to use initials avatar.</p></div></div></div>';
  }

  function renderAbout() {
    var html = '<div class="cms-panel"><div class="cms-panel__header"><h2>About Me</h2><p>Tell your story and showcase your experience.</p></div>' +
      '<div class="cms-section"><div class="cms-section__title">Biography</div>' +
      '<div class="form-group"><label>Lead Paragraph</label>' + ta('about.lead', data.about.lead, 'Bio lead sentence...') + '</div>';
    data.about.paragraphs.forEach(function (p, i) {
      html += '<div class="form-group"><label>Paragraph ' + (i + 1) + '</label>' + ta('about.paragraphs.' + i, p, 'Paragraph ' + (i + 1)) + '<div style="margin-top:4px;text-align:right"><button type="button" class="btn btn--sm btn-remove" data-path="about.paragraphs" data-index="' + i + '">Remove</button></div></div>';
    });
    html += '<button type="button" class="btn btn--sm btn--outline btn-add" data-add="paragraph" data-path="about.paragraphs">+ Add Paragraph</button>';
    html += '</div><div class="cms-section"><div class="cms-section__title">Key Statistics</div><p class="help-text" style="margin-bottom:12px">Showcase impressive numbers like years of experience or students taught.</p>';
    data.about.stats.forEach(function (s, i) {
      html += '<div class="list-row"><input type="text" data-path="about.stats.' + i + '.number" value="' + escAttr(s.number) + '" placeholder="Number" style="flex:0 0 80px"><input type="text" data-path="about.stats.' + i + '.suffix" value="' + escAttr(s.suffix) + '" placeholder="+" style="flex:0 0 60px"><input type="text" data-path="about.stats.' + i + '.label" value="' + escAttr(s.label) + '" placeholder="Label"><button type="button" class="btn-remove" data-path="about.stats" data-index="' + i + '">&times;</button></div>';
    });
    html += '<button type="button" class="btn btn--sm btn--outline btn-add" data-add="stat" data-path="about.stats">+ Add Stat</button></div></div>';
    return html;
  }

  function renderCourses() {
    var html = '<div class="cms-panel"><div class="cms-panel__header"><h2>Courses Taught</h2><p>Showcase your teaching expertise across subjects.</p></div><div class="cms-section">';
    data.courses.forEach(function (c, i) {
      html += '<div class="cms-card"><div class="cms-card__header"><span class="cms-card__title">Course ' + (i + 1) + '</span><button type="button" class="btn btn--sm btn-remove" data-path="courses" data-index="' + i + '">Remove</button></div>' +
        '<div class="form-row"><div class="form-group"><label>Icon (Emoji)</label>' + inp('courses.' + i + '.icon', c.icon, '\uD83D\uDCD6') + '</div><div class="form-group"><label>Level / Grade</label>' + inp('courses.' + i + '.level', c.level, 'All Grades') + '</div></div>' +
        '<div class="form-group"><label>Title</label>' + inp('courses.' + i + '.title', c.title, 'Course Title') + '</div>' +
        '<div class="form-group"><label>Description</label>' + ta('courses.' + i + '.description', c.description, 'Course description...') + '</div></div>';
    });
    html += '<button type="button" class="btn btn--sm btn--outline btn-add" data-add="course" data-path="courses">+ Add Course</button></div></div>';
    return html;
  }

  function renderPhilosophy() {
    var html = '<div class="cms-panel"><div class="cms-panel__header"><h2>Teaching Philosophy</h2><p>Share the values and beliefs that guide your teaching.</p></div>' +
      '<div class="cms-section"><div class="cms-section__title">Quote</div>' +
      '<div class="form-group"><label>Philosophy Quote</label>' + ta('philosophy.quote', data.philosophy.quote, 'Your teaching philosophy quote...') + '</div>' +
      '<div class="form-group"><label>Attribution</label>' + inp('philosophy.attribution', data.philosophy.attribution, '\u2014 Author Name') + '</div></div>' +
      '<div class="cms-section"><div class="cms-section__title">Core Principles</div>';
    data.philosophy.points.forEach(function (p, i) {
      html += '<div class="cms-card"><div class="cms-card__header"><span class="cms-card__title">Principle ' + (i + 1) + '</span><button type="button" class="btn btn--sm btn-remove" data-path="philosophy.points" data-index="' + i + '">Remove</button></div>' +
        '<div class="form-group"><label>Title</label>' + inp('philosophy.points.' + i + '.title', p.title, 'Title') + '</div>' +
        '<div class="form-group"><label>Description</label>' + ta('philosophy.points.' + i + '.description', p.description, 'Description...') + '</div></div>';
    });
    html += '<button type="button" class="btn btn--sm btn--outline btn-add" data-add="point" data-path="philosophy.points">+ Add Principle</button></div></div>';
    return html;
  }

  function renderAchievements() {
    var html = '<div class="cms-panel"><div class="cms-panel__header"><h2>Achievements &amp; Recognition</h2><p>Highlight your professional accomplishments.</p></div><div class="cms-section">';
    data.achievements.forEach(function (a, i) {
      html += '<div class="cms-card"><div class="cms-card__header"><span class="cms-card__title">Achievement ' + (i + 1) + '</span><button type="button" class="btn btn--sm btn-remove" data-path="achievements" data-index="' + i + '">Remove</button></div>' +
        '<div class="form-row"><div class="form-group"><label>Year</label>' + inp('achievements.' + i + '.year', a.year, '2024') + '</div><div class="form-group"><label>Title</label>' + inp('achievements.' + i + '.title', a.title, 'Achievement Title') + '</div></div>' +
        '<div class="form-group"><label>Description</label>' + ta('achievements.' + i + '.description', a.description, 'Description...') + '</div></div>';
    });
    html += '<button type="button" class="btn btn--sm btn--outline btn-add" data-add="achievement" data-path="achievements">+ Add Achievement</button></div></div>';
    return html;
  }

  function renderContact() {
    return '<div class="cms-panel"><div class="cms-panel__header"><h2>Contact Information</h2><p>How students and parents can reach you.</p></div><div class="cms-section"><div class="cms-section__title">Contact Details</div>' +
      '<div class="form-group"><label>Email Address</label>' + inp('contact.email', data.contact.email, 'teacher@example.com') + '</div>' +
      '<div class="form-group"><label>Phone Number</label>' + inp('contact.phone', data.contact.phone, '+1 (555) 123-4567') + '</div>' +
      '<div class="form-group"><label>Location</label>' + inp('contact.location', data.contact.location, 'City, State / Country') + '</div></div></div>';
  }

  function renderSEO() {
    if (!data.seo) data.seo = { metaTitle: '', metaDesc: '', ogImage: '', googleAnalytics: '' };
    return '<div class="cms-panel"><div class="cms-panel__header"><h2>SEO &amp; Settings</h2><p>Optimize your site for search engines and configure advanced options.</p></div>' +
      '<div class="cms-section"><div class="cms-section__title">Meta Tags</div>' +
      '<div class="form-group"><label>Meta Title <span style="color:#64748b;font-weight:400">(overrides site title in search results)</span></label>' + inp('seo.metaTitle', data.seo.metaTitle || '', 'Teacher Name — Professional Portfolio') + '</div>' +
      '<div class="form-group"><label>Meta Description</label>' + ta('seo.metaDesc', data.seo.metaDesc || '', 'A passionate educator with 10+ years of experience...') + '<p class="help-text">Appears in search engine results. Keep under 160 characters.</p></div>' +
      '<div class="form-group"><label>OG Image URL <span style="color:#64748b;font-weight:400">(social sharing preview)</span></label>' + inp('seo.ogImage', data.seo.ogImage || '', 'https://example.com/og-image.jpg') + '</div></div>' +
      '<div class="cms-section"><div class="cms-section__title">Advanced</div>' +
      '<div class="form-group"><label>Google Analytics ID (optional)</label>' + inp('seo.googleAnalytics', data.seo.googleAnalytics || '', 'G-XXXXXXXXXX') + '<p class="help-text">Paste your Google Analytics measurement ID.</p></div></div></div>';
  }

  function renderMedia() {
    var images = [];
    try { images = JSON.parse(localStorage.getItem(MEDIA_KEY)) || []; } catch(e) {}
    var html = '<div class="cms-panel"><div class="cms-panel__header"><h2>Media Library</h2><p>Upload and manage images for your portfolio.</p></div><div class="cms-section">' +
      '<div class="media-upload"><label class="media-upload__btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Image<input type="file" accept="image/*" id="mediaUploader" hidden></label><p class="media-upload__hint">PNG, JPG, GIF up to 5MB</p></div>' +
      '<div class="media-grid" id="cmsMediaGrid">';
    if (images.length === 0) {
      html += '<div class="media-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>No images yet. Upload your first image above.</p></div>';
    } else {
      images.forEach(function (img, i) {
        html += '<div class="media-item" data-url="' + escAttr(img.url || img) + '"><img src="' + escAttr(img.url || img) + '" alt="Uploaded image"><button class="media-item__remove" data-index="' + i + '">&times;</button></div>';
      });
    }
    html += '</div></div></div>';
    return html;
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
    if (!data.style) data.style = { fontPair: 'modern-sans', roundness: 'rounded', shadowDepth: 'soft', spacing: 'normal', headerFixed: true, buttonStyle: 'rounded', sectionStyle: 'bordered' };
    var current = data.theme.name || 'modern';
    var themeCards = themesList.map(function (t) {
      var ac = t.id === current ? ' active' : '';
      return '<div class="theme-card' + ac + '" data-theme="' + t.id + '" data-primary="' + t.primary + '" data-accent="' + t.accent + '"><div class="theme-card__swatch"><div style="background:' + t.primary + ';width:22px;height:22px;border-radius:50%;display:inline-block"></div><div style="background:' + t.accent + ';width:22px;height:22px;border-radius:50%;display:inline-block"></div></div><div class="theme-card__info"><strong>' + t.label + '</strong><span>' + t.desc + '</span></div></div>';
    }).join('');
    var layouts = ['wide', 'boxed', 'full'];
    var layoutHTML = layouts.map(function (l) {
      var ch = (data.theme.layout || 'wide') === l ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="layout" value="' + l + '"' + ch + '>' + l.charAt(0).toUpperCase() + l.slice(1) + '</label>';
    }).join('');
    var heroStyles = ['centered', 'split', 'left'];
    var heroHTML = heroStyles.map(function (s) {
      var ch = (data.theme.heroStyle || 'centered') === s ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="heroStyle" value="' + s + '"' + ch + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</label>';
    }).join('');

    var sty = data.style;
    var fontPairs = [
      { id: 'modern-sans', label: 'Modern Sans' },
      { id: 'classic-serif', label: 'Classic Serif' },
      { id: 'academic', label: 'Academic' },
      { id: 'playful', label: 'Playful' },
      { id: 'minimalist', label: 'Minimalist' },
      { id: 'elegant', label: 'Elegant' }
    ];
    var fontOpts = fontPairs.map(function (f) {
      return '<option value="' + f.id + '"' + (sty.fontPair === f.id ? ' selected' : '') + '>' + f.label + '</option>';
    }).join('');

    var roundnessOpts = [
      { id: 'sharp', label: 'Sharp (2-6px)' },
      { id: 'rounded', label: 'Rounded (8-16px)' },
      { id: 'pill', label: 'Pill (24-40px)' }
    ];
    var roundHTML = roundnessOpts.map(function (r) {
      var ch = (sty.roundness || 'rounded') === r.id ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="roundness" value="' + r.id + '"' + ch + '>' + r.label + '</label>';
    }).join('');

    var shadowOpts = [
      { id: 'flat', label: 'Flat (no shadow)' },
      { id: 'soft', label: 'Soft (subtle)' },
      { id: 'elevated', label: 'Elevated (medium)' },
      { id: 'deep', label: 'Deep (heavy)' }
    ];
    var shadowRadios = shadowOpts.map(function (s) {
      var ch = (sty.shadowDepth || 'soft') === s.id ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="shadowDepth" value="' + s.id + '"' + ch + '>' + s.label + '</label>';
    }).join('');

    var spacingOpts = [
      { id: 'compact', label: 'Compact' },
      { id: 'normal', label: 'Normal' },
      { id: 'spacious', label: 'Spacious' }
    ];
    var spaceRadios = spacingOpts.map(function (s) {
      var ch = (sty.spacing || 'normal') === s.id ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="spacing" value="' + s.id + '"' + ch + '>' + s.label + '</label>';
    }).join('');

    var btnOpts = [
      { id: 'square', label: 'Square' },
      { id: 'rounded', label: 'Rounded' },
      { id: 'pill', label: 'Pill' }
    ];
    var btnRadios = btnOpts.map(function (b) {
      var ch = (sty.buttonStyle || 'rounded') === b.id ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="buttonStyle" value="' + b.id + '"' + ch + '>' + b.label + '</label>';
    }).join('');

    var secOpts = [
      { id: 'bordered', label: 'Bordered' },
      { id: 'elevated', label: 'Elevated' },
      { id: 'minimal', label: 'Minimal' }
    ];
    var secRadios = secOpts.map(function (s) {
      var ch = (sty.sectionStyle || 'bordered') === s.id ? ' checked' : '';
      return '<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="sectionStyle" value="' + s.id + '"' + ch + '>' + s.label + '</label>';
    }).join('');

    var headerCheck = sty.headerFixed !== false ? ' checked' : '';

    return '<div class="cms-panel"><div class="cms-panel__header"><h2>Themes &amp; Style</h2><p>Customize the look and feel of your portfolio.</p></div>' +
      '<div class="cms-section"><div class="cms-section__title">Theme Color Presets</div><p style="font-size:.82rem;color:#64748b;margin-bottom:14px">8 professional design presets — click to apply instantly.</p><div class="theme-selector" style="grid-template-columns:repeat(4,1fr)">' + themeCards + '</div></div>' +
      '<div class="cms-section"><div class="cms-section__title">Layout Width</div><div style="display:flex;gap:24px;margin-bottom:20px">' + layoutHTML + '</div></div>' +
      '<div class="cms-section"><div class="cms-section__title">Hero Alignment</div><div style="display:flex;gap:24px;margin-bottom:20px">' + heroHTML + '</div></div>' +

      '<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0" />' +
      '<h3 style="font-size:.9rem;font-weight:700;margin-bottom:16px">Advanced Style Customization</h3>' +

      '<div class="cms-section"><div class="cms-section__title">Font Pair</div><p style="font-size:.75rem;color:#64748b;margin-bottom:10px">Choose heading + body font combination</p>' +
      '<select class="cms-input" id="fontPair" style="max-width:320px">' + fontOpts + '</select></div>' +

      '<div class="cms-section"><div class="cms-section__title">Corner Roundness</div><p style="font-size:.75rem;color:#64748b;margin-bottom:8px">Control how rounded cards, buttons and sections appear</p><div style="display:flex;gap:24px">' + roundHTML + '</div></div>' +

      '<div class="cms-section"><div class="cms-section__title">Shadow Depth</div><p style="font-size:.75rem;color:#64748b;margin-bottom:8px">Control depth and elevation of cards and sections</p><div style="display:flex;gap:24px">' + shadowRadios + '</div></div>' +

      '<div class="cms-section"><div class="cms-section__title">Section Spacing</div><p style="font-size:.75rem;color:#64748b;margin-bottom:8px">Vertical spacing between sections</p><div style="display:flex;gap:24px">' + spaceRadios + '</div></div>' +

      '<div class="cms-section"><div class="cms-section__title">Button Shape</div><p style="font-size:.75rem;color:#64748b;margin-bottom:8px">Shape of call-to-action buttons</p><div style="display:flex;gap:24px">' + btnRadios + '</div></div>' +

      '<div class="cms-section"><div class="cms-section__title">Section Style</div><p style="font-size:.75rem;color:#64748b;margin-bottom:8px">Visual treatment of alternating sections</p><div style="display:flex;gap:24px">' + secRadios + '</div></div>' +

      '<div class="cms-section"><div class="cms-section__title">Header Behavior</div><p style="font-size:.75rem;color:#64748b;margin-bottom:8px">Stick header to top on scroll or let it scroll with page</p>' +
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="headerFixed"' + headerCheck + '><span style="font-size:.85rem">Fixed header (stays at top)</span></label></div>' +
      '</div>';
  }

  function updatePreview() {
    var frame = document.getElementById('previewFrame');
    if (!frame || !previewOpen) return;
    try {
      var html = generatePreviewHTML();
      if ('srcdoc' in frame) { frame.srcdoc = html; }
      else { var d = frame.contentDocument || frame.contentWindow.document; d.open(); d.write(html); d.close(); }
      frame.className = 'preview-' + currentDevice;
    } catch (e) { console.error('Preview error:', e); }
  }

  var THEMES = {
    modern: { primary: '#4f46e5', accent: '#059669' }, warm: { primary: '#d97706', accent: '#b45309' },
    academic: { primary: '#1e3a8a', accent: '#1e40af' }, creative: { primary: '#db2777', accent: '#c026d3' },
    minimal: { primary: '#0f172a', accent: '#334155' }, emerald: { primary: '#047857', accent: '#059669' },
    sunset: { primary: '#ea580c', accent: '#7c3aed' }, cyber: { primary: '#0284c7', accent: '#0891b2' }
  };

  function generatePreviewHTML() {
    if (!data.theme) data.theme = { name: 'modern', layout: 'wide', heroStyle: 'centered' };
    if (!data.style) data.style = { fontPair: 'modern-sans', roundness: 'rounded', shadowDepth: 'soft', spacing: 'normal', headerFixed: true, buttonStyle: 'rounded', sectionStyle: 'bordered' };
    var theme = THEMES[data.theme.name] || THEMES.modern;
    var primary = theme.primary, accent = theme.accent;
    function rgba(h, a) { var r=parseInt(h.slice(1,3),16), g=parseInt(h.slice(3,5),16), b=parseInt(h.slice(5,7),16); return 'rgba('+r+','+g+','+b+','+a+')'; }
    var s = data.site || {}, h = data.hero || {}, a = data.about || {}, p = data.philosophy || {}, c = data.contact || {};
    var sty = data.style;

    // Fonts
    var fontMap = {
      'modern-sans':{h:"'Plus Jakarta Sans',sans-serif",b:"'Inter',sans-serif"},
      'classic-serif':{h:"'Playfair Display',serif",b:"'Inter',serif"},
      'academic':{h:"'Merriweather',serif",b:"'Source Sans Pro',sans-serif"},
      'playful':{h:"'DM Sans',sans-serif",b:"'Nunito',sans-serif"},
      'minimalist':{h:"'Helvetica Neue',sans-serif",b:"'Helvetica Neue',sans-serif"},
      'elegant':{h:"'Cormorant Garamond',serif",b:"'Proza Libre',sans-serif"}
    };
    var fp = fontMap[sty.fontPair] || fontMap['modern-sans'];

    // Roundness
    var rMap = {sharp:{sm:'2px',md:'4px',lg:'6px',full:'8px'},rounded:{sm:'8px',md:'12px',lg:'16px',full:'9999px'},pill:{sm:'24px',md:'32px',lg:'40px',full:'9999px'}};
    var rad = rMap[sty.roundness] || rMap.rounded;

    // Shdows
    var shMap = {
      flat:{sm:'none',md:'none',lg:'none',xl:'none'},
      soft:{sm:'0 1px 2px rgba(0,0,0,0.05)',md:'0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)',lg:'0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -4px rgba(0,0,0,0.04)',xl:'0 20px 25px -5px rgba(0,0,0,0.08),0 8px 10px -6px rgba(0,0,0,0.04)'},
      elevated:{sm:'0 2px 4px rgba(0,0,0,0.08)',md:'0 8px 16px rgba(0,0,0,0.1)',lg:'0 16px 24px rgba(0,0,0,0.1)',xl:'0 24px 48px rgba(0,0,0,0.12)'},
      deep:{sm:'0 3px 6px rgba(0,0,0,0.12)',md:'0 12px 24px rgba(0,0,0,0.14)',lg:'0 24px 48px rgba(0,0,0,0.16)',xl:'0 40px 80px rgba(0,0,0,0.2)'}
    };
    var sh = shMap[sty.shadowDepth] || shMap.soft;
    var sp = {compact:'48px',normal:'96px',spacious:'140px'}[sty.spacing] || '96px';
    var btnR = {square:'2px',rounded:'12px',pill:'9999px'}[sty.buttonStyle] || '12px';
    var hdrFixed = sty.headerFixed !== false;

    var statsHtml = (a.stats || []).map(function (st) { return '<div style="text-align:center"><strong style="font-size:1.3rem;color:'+primary+';display:block">'+escHtml(st.number)+(st.suffix||'')+'</strong><span style="font-size:.7rem;color:#64748b">'+escHtml(st.label||'')+'</span></div>'; }).join('');
    var coursesHtml = (data.courses || []).map(function (co) { return '<div style="padding:12px;border:1px solid #e2e8f0;border-radius:var(--r-md);margin-bottom:8px;background:#fff;box-shadow:var(--sh-sm)"><div style="font-size:1.1rem;margin-bottom:4px">'+escHtml(co.icon||'')+'</div><strong>'+escHtml(co.title||'')+'</strong><p style="font-size:.75rem;color:#64748b;margin:2px 0">'+escHtml(co.description||'')+'</p><span style="font-size:.65rem;background:'+rgba(accent,.12)+';color:'+accent+';padding:2px 8px;border-radius:999px">'+escHtml(co.level||'')+'</span></div>'; }).join('');
    var pointsHtml = (p.points || []).map(function (pt) { return '<div style="background:#fff;padding:12px;border-radius:var(--r-md);border:1px solid #e2e8f0;box-shadow:var(--sh-sm)"><strong>'+escHtml(pt.title||'')+'</strong><p style="font-size:.75rem;color:#64748b;margin-top:4px">'+escHtml(pt.description||'')+'</p></div>'; }).join('');
    var achievementsHtml = (data.achievements || []).map(function (ach) { return '<div style="padding:12px;border:1px solid #e2e8f0;border-radius:var(--r-md);margin-bottom:8px;background:#fff;box-shadow:var(--sh-sm)"><span style="font-size:.65rem;background:'+rgba(primary,.12)+';color:'+primary+';padding:2px 8px;border-radius:999px;font-weight:700">'+escHtml(ach.year||'')+'</span><strong style="display:block;margin-top:4px">'+escHtml(ach.title||'')+'</strong><p style="font-size:.75rem;color:#64748b">'+escHtml(ach.description||'')+'</p></div>'; }).join('');
    var altSecBg = data.theme.sectionStyle === 'elevated' ? '#fff' : '#edf2f7';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>' +
      ':root{--p:'+primary+';--a:'+accent+
      ';--fh:'+fp.h+';--fb:'+fp.b+
      ';--r-sm:'+rad.sm+';--r-md:'+rad.md+';--r-lg:'+rad.lg+';--r-full:'+rad.full+
      ';--sh-sm:'+sh.sm+';--sh-md:'+sh.md+';--sh-lg:'+sh.lg+';--sh-xl:'+sh.xl+
      ';--sp:'+sp+';--br:'+btnR+
      '}body{font-family:var(--fb);color:#1e293b;line-height:1.6;margin:0;padding:0;background:#f8fafc}.container{max-width:900px;margin:0 auto;padding:0 20px}.header{background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 0;position:'+(hdrFixed?'sticky':'static')+';top:0;z-index:10}.logo{font-weight:800;font-size:1.05rem;color:var(--p);text-decoration:none}.hero{padding:32px 0;background:linear-gradient(135deg,'+rgba(primary,.04)+',#fff);text-align:'+(data.theme.heroStyle||'centered')+'}' +
      '.hero__title{font-size:1.7rem;font-weight:800;margin-bottom:8px;font-family:var(--fh)}.highlight{color:var(--p)}.hero__desc{font-size:.85rem;color:#64748b;max-width:480px;'+(data.theme.heroStyle==='centered'?'margin:0 auto':'')+'}.section{padding:var(--sp) 0}.section__title{font-size:1.15rem;font-weight:700;margin-bottom:14px;text-align:center;font-family:var(--fh)}.stats{display:flex;justify-content:space-around;background:#fff;padding:14px;border-radius:var(--r-md);border:1px solid #e2e8f0;box-shadow:var(--sh-sm);margin-top:14px}.phil{display:grid;grid-template-columns:1fr 1fr;gap:10px}.foot{padding:16px 0;text-align:center;font-size:.75rem;color:#64748b;border-top:1px solid #e2e8f0;margin-top:24px}' +
      '@media(max-width:600px){.phil{grid-template-columns:1fr}}</style></head><body>' +
      '<div class="header"><div class="container"><span class="logo">'+escHtml(s.title||'Portfolio')+'</span></div></div>' +
      '<section class="hero"><div class="container"><span style="font-size:.65rem;font-weight:700;color:var(--p);text-transform:uppercase;letter-spacing:.1em">'+escHtml(h.tagline||'')+'</span>' +
      '<h1 class="hero__title">Empowering <span class="highlight">'+escHtml(h.highlight||'Every Learner')+'</span></h1>' +
      '<p class="hero__desc">'+escHtml(h.description||'')+'</p></div></section>' +
      '<section class="section"><div class="container"><h2 class="section__title">About Me</h2><p style="font-size:.85rem;color:#475569">'+escHtml(a.lead||'')+'</p><div class="stats">'+statsHtml+'</div></div></section>' +
      '<section class="section" style="background:'+altSecBg+'"><div class="container"><h2 class="section__title">Courses</h2>'+coursesHtml+'</div></section>' +
      '<section class="section"><div class="container"><h2 class="section__title">Philosophy</h2><div style="background:#fff;padding:14px;border-left:4px solid var(--p);border-radius:0 var(--r-md) var(--r-md) 0;font-style:italic;font-size:.85rem;margin-bottom:16px;box-shadow:var(--sh-sm)">"'+escHtml(p.quote||'')+'"</div><div class="phil">'+pointsHtml+'</div></div></section>' +
      '<section class="section" style="background:'+altSecBg+'"><div class="container"><h2 class="section__title">Achievements</h2>'+achievementsHtml+'</div></section>' +
      '<section class="section"><div class="container"><h2 class="section__title">Get in Touch</h2><p style="font-size:.8rem;text-align:center;color:#64748b">'+escHtml(c.email||'')+' &bull; '+escHtml(c.phone||'')+'</p></div></section>' +
      '<footer class="foot"><p>&copy; '+new Date().getFullYear()+' '+escHtml(s.title||'')+'</p></footer>' +
      '</body></html>';
  }

  function togglePreview() {
    previewOpen = !previewOpen;
    document.getElementById('cmsPreview').style.display = previewOpen ? 'flex' : 'none';
  }

  function setDevice(device) {
    currentDevice = device;
    document.querySelectorAll('.device-btn').forEach(function (b) { b.classList.remove('active'); });
    document.querySelector('.device-btn[data-device="' + device + '"]').classList.add('active');
    var frame = document.getElementById('previewFrame');
    if (frame) frame.className = 'preview-' + device;
  }

  function mergeDeep(a, b) {
    var result = JSON.parse(JSON.stringify(a));
    for (var k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
        result[k] = mergeDeep(result[k] || {}, b[k]);
      } else {
        if (result[k] === undefined) result[k] = b[k];
      }
    }
    return result;
  }

  function init() {
    var stored = getData();
    if (stored) { data = mergeDeep(stored, defaultData); } else { data = JSON.parse(JSON.stringify(defaultData)); }
    saveData(data);

    render();
    updatePreview();

    document.getElementById('fileInput').addEventListener('change', handleFileLoad);
    document.getElementById('btnLoad').addEventListener('click', loadFile);
    document.getElementById('btnDownload').addEventListener('click', handleDownload);
    document.getElementById('btnBuild').addEventListener('click', handleBuild);
    document.getElementById('btnTogglePreview').addEventListener('click', togglePreview);
    document.getElementById('btnUndo').addEventListener('click', undoLast);

    document.querySelectorAll('.device-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setDevice(btn.dataset.device); });
    });

    // Media upload handler
    document.addEventListener('change', function (e) {
      if (e.target.id === 'mediaUploader') {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('File too large (max 5MB)'); return; }
        var reader = new FileReader();
        reader.onload = function (ev) {
          var images = JSON.parse(localStorage.getItem(MEDIA_KEY)) || [];
          images.push({ url: ev.target.result, name: file.name });
          localStorage.setItem(MEDIA_KEY, JSON.stringify(images));
          showToast('Image uploaded: ' + file.name);
          if (getCurrentTab() === 'media') render();
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      }
    });

    // Media remove handler
    document.addEventListener('click', function (e) {
      if (e.target.classList.contains('media-item__remove')) {
        var idx = parseInt(e.target.dataset.index);
        var images = JSON.parse(localStorage.getItem(MEDIA_KEY)) || [];
        if (idx >= 0 && idx < images.length) {
          images.splice(idx, 1);
          localStorage.setItem(MEDIA_KEY, JSON.stringify(images));
          showToast('Image removed');
          if (getCurrentTab() === 'media') render();
        }
      }
    });

    // Select media item (copy URL)
    document.addEventListener('click', function (e) {
      var item = e.target.closest('.media-item');
      if (item && !e.target.classList.contains('media-item__remove')) {
        var url = item.dataset.url;
        if (url) {
          navigator.clipboard.writeText(url).then(function () {
            showToast('Image URL copied to clipboard!');
          }).catch(function () {
            showToast('Image URL: ' + url);
          });
        }
      }
    });

    showToast('CMS loaded successfully');
  }

  init();
})();
