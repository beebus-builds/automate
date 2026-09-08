/* TeacherFolio on-site editor — lazy-loaded ONLY for the site owner.
   The loader in script.js injects this file after verifying
   GET /api/auth user.id === page teacherId. All reads/writes go through
   the session-authenticated /api/data + /api/build endpoints, so even a
   tampered client can only ever touch its own content. */
(function () {
  'use strict';

  /* ---------- tiny DOM helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function getPath(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function setPath(obj, path, val) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = val;
  }

  /* ---------- page -> section mapping ---------- */
  function currentFile() {
    var base = window.location.pathname.split('/').pop() || '';
    base = base.split('?')[0].split('#')[0];
    return base === '' ? 'index.html' : base;
  }

  var FILE_LABEL = {
    'index.html': 'Home',
    'about.html': 'About',
    'courses.html': 'Courses',
    'philosophy.html': 'Philosophy',
    'achievements.html': 'Achievements',
    'contact.html': 'Contact'
  };

  /* Field schema: { label, path, type: text|textarea|lines|list, fields? } */
  var SCHEMAS = {
    'index.html': [
      { label: 'Site title', path: 'site.title', type: 'text' },
      { label: 'Hero tagline', path: 'hero.tagline', type: 'text' },
      { label: 'Hero title', path: 'hero.title', type: 'text' },
      { label: 'Hero description', path: 'hero.description', type: 'textarea' },
      { label: 'Initials (logo)', path: 'hero.initials', type: 'text' }
    ],
    'about.html': [
      { label: 'Lead sentence', path: 'about.lead', type: 'textarea' },
      { label: 'Paragraphs (one per line)', path: 'about.paragraphs', type: 'lines' },
      { label: 'Stats', path: 'about.stats', type: 'list', fields: [
        { label: 'Number', path: 'number', type: 'text' },
        { label: 'Suffix', path: 'suffix', type: 'text' },
        { label: 'Label', path: 'label', type: 'text' }
      ] }
    ],
    'courses.html': [
      { label: 'Courses', path: 'courses', type: 'list', fields: [
        { label: 'Icon (emoji)', path: 'icon', type: 'text' },
        { label: 'Title', path: 'title', type: 'text' },
        { label: 'Description', path: 'description', type: 'textarea' },
        { label: 'Level', path: 'level', type: 'text' }
      ] }
    ],
    'philosophy.html': [
      { label: 'Quote', path: 'philosophy.quote', type: 'textarea' },
      { label: 'Attribution', path: 'philosophy.attribution', type: 'text' },
      { label: 'Points', path: 'philosophy.points', type: 'list', fields: [
        { label: 'Title', path: 'title', type: 'text' },
        { label: 'Description', path: 'description', type: 'textarea' }
      ] }
    ],
    'achievements.html': [
      { label: 'Achievements', path: 'achievements', type: 'list', fields: [
        { label: 'Year', path: 'year', type: 'text' },
        { label: 'Title', path: 'title', type: 'text' },
        { label: 'Description', path: 'description', type: 'textarea' }
      ] }
    ],
    'contact.html': [
      { label: 'Email', path: 'contact.email', type: 'text' },
      { label: 'Phone', path: 'contact.phone', type: 'text' },
      { label: 'Location', path: 'contact.location', type: 'text' }
    ]
  };

  /* ---------- editor styles (self-contained, no site CSS dependency) ---------- */
  var CSS = [
    '.tfedit-btn{position:fixed;left:24px;bottom:24px;z-index:10000;display:flex;align-items:center;gap:8px;',
    'padding:12px 20px;border:none;border-radius:999px;background:#4f46e5;color:#fff;font-size:.85rem;font-weight:700;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;cursor:pointer;box-shadow:0 8px 28px rgba(0,0,0,.45);}',
    '.tfedit-btn:hover{background:#4338ca;}',
    '.tfedit-panel{position:fixed;top:0;right:0;bottom:0;width:400px;max-width:94vw;z-index:10001;display:flex;flex-direction:column;',
    'background:#0f172a;color:#e2e8f0;border-left:1px solid rgba(255,255,255,.1);box-shadow:-16px 0 50px rgba(0,0,0,.5);',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;transform:translateX(105%);transition:transform .25s ease;}',
    '.tfedit-panel--open{transform:translateX(0);}',
    '.tfedit-head{padding:16px 18px;background:#4f46e5;color:#fff;display:flex;align-items:center;gap:10px;}',
    '.tfedit-head h2{font-size:.95rem;font-weight:700;margin:0;flex:1;}',
    '.tfedit-head button{background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:8px;padding:7px 12px;font-size:.78rem;font-weight:600;cursor:pointer;}',
    '.tfedit-head button:hover{background:rgba(255,255,255,.3);}',
    '.tfedit-status{padding:10px 18px;font-size:.78rem;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,.08);min-height:20px;}',
    '.tfedit-status--ok{color:#34d399;}.tfedit-status--err{color:#f87171;}',
    '.tfedit-body{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:14px;}',
    '.tfedit-field label{display:block;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:6px;}',
    '.tfedit-field input,.tfedit-field textarea{width:100%;box-sizing:border-box;padding:10px 12px;background:#1e293b;border:1px solid rgba(255,255,255,.12);',
    'border-radius:10px;color:#fff;font-size:.85rem;font-family:inherit;outline:none;}',
    '.tfedit-field textarea{min-height:80px;resize:vertical;}',
    '.tfedit-field input:focus,.tfedit-field textarea:focus{border-color:#6366f1;}',
    '.tfedit-list{border:1px dashed rgba(255,255,255,.15);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:10px;}',
    '.tfedit-item{background:#1e293b;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:8px;}',
    '.tfedit-item__top{display:flex;align-items:center;justify-content:space-between;}',
    '.tfedit-item__top strong{font-size:.78rem;color:#cbd5e1;}',
    '.tfedit-del{background:rgba(239,68,68,.12);border:none;color:#f87171;border-radius:8px;padding:5px 10px;font-size:.72rem;font-weight:700;cursor:pointer;}',
    '.tfedit-del:hover{background:rgba(239,68,68,.25);}',
    '.tfedit-add{background:rgba(99,102,241,.12);border:1px dashed rgba(99,102,241,.5);color:#a5b4fc;border-radius:10px;padding:9px;font-size:.8rem;font-weight:700;cursor:pointer;}',
    '.tfedit-add:hover{background:rgba(99,102,241,.22);}',
    '.tfedit-foot{padding:14px 18px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:8px;}',
    '.tfedit-save{flex:1;background:#4f46e5;border:none;color:#fff;border-radius:10px;padding:12px;font-size:.85rem;font-weight:700;cursor:pointer;}',
    '.tfedit-save:hover:not(:disabled){background:#4338ca;}',
    '.tfedit-save:disabled{opacity:.6;cursor:wait;}',
    '.tfedit-cms{background:transparent;border:1px solid rgba(255,255,255,.15);color:#cbd5e1;border-radius:10px;padding:12px 16px;font-size:.85rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;}',
    '.tfedit-cms:hover{background:rgba(255,255,255,.06);}',
    '.tfedit-publish{flex:1;background:#059669;border:none;color:#fff;border-radius:10px;padding:12px;font-size:.85rem;font-weight:700;cursor:pointer;}',
    '.tfedit-publish:hover:not(:disabled){background:#047857;}',
    '.tfedit-publish:disabled{opacity:.6;cursor:wait;}',
    '.tfedit-live{font-size:.78rem;color:#94a3b8;padding:0 18px 12px;line-height:1.5;}',
    '.tfedit-live a{color:#34d399;font-weight:700;word-break:break-all;}',
    '.tfedit-copy{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.4);color:#34d399;border-radius:8px;',
    'padding:5px 12px;font-size:.75rem;font-weight:700;cursor:pointer;margin-left:8px;white-space:nowrap;}',
    '.tfedit-copy:hover{background:rgba(52,211,153,.22);}',
    '.tfedit-note{font-size:.8rem;color:#94a3b8;background:rgba(255,255,255,.04);border-radius:10px;padding:10px 12px;line-height:1.5;}',
    '@media (max-width:480px){.tfedit-btn{left:16px;bottom:16px;padding:10px 16px;}}'
  ].join('\n');

  /* ---------- state ---------- */
  var doc = null;
  var bindings = [];
  var panel = null;
  var statusEl = null;
  var saveBtn = null;
  var publishBtn = null;
  var liveEl = null;
  var file = currentFile();

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'tfedit-status' + (kind === 'ok' ? ' tfedit-status--ok' : kind === 'err' ? ' tfedit-status--err' : '');
  }

  /* ---------- form builders ---------- */
  function bindScalar(container, def) {
    var wrap = el('div', 'tfedit-field');
    wrap.appendChild(el('label', null, def.label));
    var val = getPath(doc, def.path);
    var input;
    if (def.type === 'textarea' || def.type === 'lines') {
      input = document.createElement('textarea');
      input.value = def.type === 'lines'
        ? (Array.isArray(val) ? val.join('\n') : '')
        : (val === undefined || val === null ? '' : String(val));
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = val === undefined || val === null ? '' : String(val);
    }
    wrap.appendChild(input);
    container.appendChild(wrap);
    bindings.push({ def: def, input: input });
  }

  function collectScalar(binding) {
    var def = binding.def;
    if (def.type === 'lines') {
      setPath(doc, def.path, binding.input.value.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; }));
    } else {
      setPath(doc, def.path, binding.input.value);
    }
  }

  function blankItem(fields) {
    var o = {};
    fields.forEach(function (f) { o[f.path] = ''; });
    return o;
  }

  function bindList(container, def) {
    var wrap = el('div', 'tfedit-field');
    wrap.appendChild(el('label', null, def.label));
    var listBox = el('div', 'tfedit-list');
    wrap.appendChild(listBox);
    container.appendChild(wrap);

    var items = getPath(doc, def.path);
    if (!Array.isArray(items)) { items = []; setPath(doc, def.path, items); }

    function renderItems() {
      while (listBox.firstChild && listBox.firstChild.className !== 'tfedit-add') listBox.removeChild(listBox.firstChild);
      items.forEach(function (item, idx) {
        var card = el('div', 'tfedit-item');
        var top = el('div', 'tfedit-item__top');
        top.appendChild(el('strong', null, '#' + (idx + 1)));
        var del = el('button', 'tfedit-del', 'Remove');
        del.type = 'button';
        del.addEventListener('click', function () {
          items.splice(idx, 1);
          renderItems();
        });
        top.appendChild(del);
        card.appendChild(top);
        (def.fields || []).forEach(function (f) {
          var lab = el('label', null, f.label);
          lab.style.cssText = 'font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:4px;display:block;';
          card.appendChild(lab);
          var inp = f.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
          if (f.type !== 'textarea') inp.type = 'text';
          inp.style.cssText = 'width:100%;box-sizing:border-box;padding:8px 10px;background:#0f172a;border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#fff;font-size:.83rem;font-family:inherit;outline:none;';
          inp.value = item[f.path] === undefined || item[f.path] === null ? '' : String(item[f.path]);
          inp.setAttribute('data-tfedit-item', String(idx));
          inp.setAttribute('data-tfedit-field', f.path);
          card.appendChild(inp);
        });
        listBox.insertBefore(card, addBtn);
      });
    }

    var addBtn = el('button', 'tfedit-add', '+ Add ' + def.label.replace(/s$/, ''));
    addBtn.type = 'button';
    addBtn.addEventListener('click', function () {
      items.push(blankItem(def.fields || []));
      renderItems();
    });
    listBox.appendChild(addBtn);
    renderItems();

    bindings.push({
      def: def,
      collect: function () {
        var fresh = [];
        var cards = listBox.querySelectorAll('.tfedit-item');
        for (var i = 0; i < cards.length; i++) {
          var o = {};
          var inputs = cards[i].querySelectorAll('[data-tfedit-field]');
          for (var j = 0; j < inputs.length; j++) {
            o[inputs[j].getAttribute('data-tfedit-field')] = inputs[j].value;
          }
          fresh.push(o);
        }
        setPath(doc, def.path, fresh);
      }
    });
  }

  /* Custom sections (sec-<id>.html): simple title/subtitle/content unless block-based */
  function customSchema() {
    var m = file.match(/^sec-(.+)\.html$/);
    if (!m) return null;
    var id = m[1];
    var list = getPath(doc, 'customSections');
    var idx = Array.isArray(list) ? list.findIndex(function (s) { return s && s.id === id; }) : -1;
    if (idx === -1) return null;
    var base = 'customSections.' + idx;
    var schema = [
      { label: 'Title', path: base + '.title', type: 'text' },
      { label: 'Subtitle', path: base + '.subtitle', type: 'text' }
    ];
    var sect = list[idx];
    if (Array.isArray(sect.blocks)) return { schema: schema, blocked: true };
    schema.push({ label: 'Content (HTML allowed)', path: base + '.content', type: 'textarea' });
    return { schema: schema, blocked: false };
  }

  /* ---------- panel ---------- */
  function buildPanel() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var toggle = el('button', 'tfedit-btn');
    toggle.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg><span>Edit this page</span>';
    document.body.appendChild(toggle);

    panel = el('div', 'tfedit-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Edit page content');

    var head = el('div', 'tfedit-head');
    var pageLabel = FILE_LABEL[file] || file.replace(/^sec-(.+)\.html$/, '$1').replace(/\.html$/, '');
    head.appendChild(el('h2', null, 'Editing: ' + pageLabel));
    var cmsLink = el('a', 'tfedit-cms', 'Rebuild in Chat');
    cmsLink.href = '/build';
    cmsLink.target = '_blank';
    cmsLink.rel = 'noopener';
    var closeBtn = el('button', null, 'Close');
    closeBtn.addEventListener('click', function () { panel.classList.remove('tfedit-panel--open'); });
    head.appendChild(closeBtn);
    panel.appendChild(head);

    statusEl = el('div', 'tfedit-status', 'Loading your content…');
    panel.appendChild(statusEl);

    liveEl = el('div', 'tfedit-live', '');
    liveEl.style.display = 'none';
    panel.appendChild(liveEl);

    var body = el('div', 'tfedit-body');
    panel.appendChild(body);

    var foot = el('div', 'tfedit-foot');
    saveBtn = el('button', 'tfedit-save', 'Save & rebuild');
    saveBtn.addEventListener('click', saveAll);
    foot.appendChild(saveBtn);
    publishBtn = el('button', 'tfedit-publish', 'Publish');
    publishBtn.title = 'Publish live with your name in the web address';
    publishBtn.addEventListener('click', publishSite);
    foot.appendChild(publishBtn);
    foot.appendChild(cmsLink);
    panel.appendChild(foot);

    document.body.appendChild(panel);

    toggle.addEventListener('click', function () {
      panel.classList.toggle('tfedit-panel--open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') panel.classList.remove('tfedit-panel--open');
    });

    loadDoc(body);
  }

  function loadDoc(body) {
    fetch('/api/data', { credentials: 'include' })
      .then(function (r) {
        if (r.status === 401) throw new Error('auth');
        if (!r.ok) throw new Error('load');
        return r.json();
      })
      .then(function (d) {
        doc = d && typeof d === 'object' ? d : {};
        renderForm(body);
        renderLive();
        setStatus('Loaded. Edit, then Save & rebuild.', 'ok');
      })
      .catch(function (err) {
        setStatus(err && err.message === 'auth'
          ? 'Session expired — sign in on the home page, then come back here.'
          : 'Could not load your content. Try reloading the page.', 'err');
      });
  }

  function renderForm(body) {
    bindings = [];
    var schema = SCHEMAS[file];
    var blocked = false;
    if (!schema) {
      var custom = customSchema();
      if (!custom) {
        body.appendChild(el('div', 'tfedit-note', 'This page has no editable fields here. Rebuild via the chat builder to change layout.'));
        if (saveBtn) saveBtn.disabled = true;
        return;
      }
      schema = custom.schema;
      blocked = custom.blocked;
    }
    if (blocked) {
      body.appendChild(el('div', 'tfedit-note', 'This section uses the block designer — change its title above, or rebuild via Chat to edit layout and blocks.'));
    }
    schema.forEach(function (def) {
      if (def.type === 'list') bindList(body, def);
      else bindScalar(body, def);
    });
  }

  function saveAll() {
    if (!doc) { setStatus('Nothing loaded yet.', 'err'); return; }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    setStatus('Collecting your edits…', '');
    try {
      bindings.forEach(function (b) {
        if (b.collect) b.collect();
        else collectScalar(b);
      });
    } catch (e) {
      setStatus('Could not read the form. Please try again.', 'err');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & rebuild';
      return;
    }
    fetch('/api/data', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    })
      .then(function (r) {
        if (r.status === 401) throw new Error('auth');
        if (!r.ok) throw new Error('save');
        saveBtn.textContent = 'Rebuilding…';
        setStatus('Saved. Rebuilding your pages…', '');
        return fetch('/api/build', { method: 'POST', credentials: 'include' });
      })
      .then(function (r) {
        if (!r || !r.ok) throw new Error('build');
        return r.json();
      })
      .then(function () {
        setStatus('Done! Reloading…', 'ok');
        setTimeout(function () { window.location.reload(); }, 800);
      })
      .catch(function (err) {
        setStatus(err && err.message === 'auth'
          ? 'Session expired — sign in on the home page, then come back here.'
          : 'Save failed. Check your connection and try again.', 'err');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save & rebuild';
      });
  }

  function renderLive() {
    if (!liveEl) return;
    while (liveEl.firstChild) liveEl.removeChild(liveEl.firstChild);
    var dep = doc && doc.deployment;
    if (dep && dep.url) {
      liveEl.style.display = '';
      liveEl.appendChild(document.createTextNode('Live at '));
      var a = document.createElement('a');
      a.href = dep.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = dep.url;
      liveEl.appendChild(a);
      var copy = el('button', 'tfedit-copy', 'Copy link');
      copy.type = 'button';
      copy.title = 'Copy your public link to share with friends';
      copy.addEventListener('click', function () {
        var done = function () { setStatus('Link copied — send it to your friends!', 'ok'); };
        var fail = function () { setStatus('Copy failed — long-press the link to copy it.', 'err'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(dep.url).then(done, fail);
        } else {
          var ta = document.createElement('textarea');
          ta.value = dep.url;
          document.body.appendChild(ta);
          ta.select();
          try { if (document.execCommand('copy')) done(); else fail(); }
          catch (e) { fail(); }
          document.body.removeChild(ta);
        }
      });
      liveEl.appendChild(copy);
    } else {
      liveEl.style.display = 'none';
    }
  }

  /* One-click publish: server names the domain after the teacher. */
  function publishSite() {
    if (publishBtn) { publishBtn.disabled = true; publishBtn.textContent = 'Publishing…'; }
    setStatus('Publishing your site live…', '');
    fetch('/api/deploy', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (res.ok && res.body && res.body.url) {
          if (doc) doc.deployment = { projectName: res.body.projectName, url: res.body.url, at: Date.now() };
          renderLive();
          setStatus('Published! Your address is shown above.', 'ok');
        } else {
          setStatus((res.body && res.body.message) || 'Publish failed. Try again.', 'err');
        }
        if (publishBtn) { publishBtn.disabled = false; publishBtn.textContent = 'Publish'; }
      })
      .catch(function () {
        setStatus('Publish failed. Check your connection and try again.', 'err');
        if (publishBtn) { publishBtn.disabled = false; publishBtn.textContent = 'Publish'; }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPanel);
  } else {
    buildPanel();
  }
})();
