/* One-Prompt Startup Launcher — browser glue.
   Pure logic lives in generator.js (window.OPL); cached launches in launches.js. */
(function () {
  'use strict';
  var OPL = window.OPL;
  var $ = function (id) { return document.getElementById(id); };
  var STEPS = [
    { id: 'name', label: 'Naming', note: 'picking a name that fits the idea' },
    { id: 'copy', label: 'Writing copy', note: 'hero, features, pricing, FAQ' },
    { id: 'logo', label: 'Drawing logo', note: 'deterministic SVG mark' },
    { id: 'page', label: 'Building page', note: 'rendering the template' },
    { id: 'publish', label: 'Publishing', note: 'saving + shareable link' }
  ];
  var MODEL = 'gemini-3.8-flash';
  var FALLBACK_MODEL = 'gemini-3.5-flash-lite';
  var LIVE_TIMEOUT_MS = 20000;

  /* ---------- storage ---------- */
  function loadSettings() { try { return JSON.parse(localStorage.getItem('opl_settings') || '{}'); } catch (e) { return {}; } }
  function saveSettings(s) { localStorage.setItem('opl_settings', JSON.stringify(s)); }
  function loadLaunches() {
    try { var l = JSON.parse(localStorage.getItem('opl_launches') || 'null'); if (Array.isArray(l) && l.length) return l; } catch (e) {}
    var cached = (window.OPL_CACHED_WITH_LOGOS ? window.OPL_CACHED_WITH_LOGOS() : window.OPL_CACHED || []).map(function (l) { return JSON.parse(JSON.stringify(l)); });
    localStorage.setItem('opl_launches', JSON.stringify(cached));
    return cached;
  }
  function saveLaunches(list) { localStorage.setItem('opl_launches', JSON.stringify(list)); }
  function waitlistKey(slug) { return 'opl_waitlist_' + slug; }
  function getWaitlist(slug) { try { return JSON.parse(localStorage.getItem(waitlistKey(slug)) || '[]'); } catch (e) { return []; } }
  function setWaitlist(slug, list) { localStorage.setItem(waitlistKey(slug), JSON.stringify(list)); }

  var launches = loadLaunches();
  var settings = loadSettings();
  var current = null;      // Launch currently shown in result
  var serverMode = false;  // true when server.py answers /api/health

  /* ---------- rail ---------- */
  function renderRail(state) {
    $('rail').innerHTML = STEPS.map(function (s, i) {
      var cls = '', mark = (i + 1);
      if (state === 'idle') cls = '';
      else if (i < state) { cls = 'done'; mark = '✓'; }
      else if (i === state) cls = 'run';
      return '<div class="rail-step ' + cls + '"><span class="dot">' + mark + '</span><span>' + s.label + '<small>' + s.note + '</small></span></div>';
    }).join('');
  }
  function setStatus(html) { $('status-line').innerHTML = html; }

  /* ---------- live Gemini ---------- */
  function geminiGenerate(prompt, model) {
    var key = settings.geminiKey;
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key);
    var schema = { type: 'OBJECT', properties: {
      name: { type: 'STRING' }, tagline: { type: 'STRING' }, description: { type: 'STRING' },
      features: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, text: { type: 'STRING' } } } },
      pricing: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, price: { type: 'STRING' }, note: { type: 'STRING' } } } },
      faq: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: { type: 'STRING' }, a: { type: 'STRING' } } } },
      nameOptions: { type: 'ARRAY', items: { type: 'STRING' } }
    }, required: ['name', 'tagline', 'description', 'features', 'pricing', 'faq'] };
    var body = { generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.7 },
      contents: [{ role: 'user', parts: [{ text: 'You name and write copy for a startup. The founder\'s one-sentence idea is: "' + prompt + '". Return JSON only: a short memorable name (one word if possible), a tagline under 90 characters, a one-paragraph plain description, exactly 3 features (title + one sentence each), exactly 3 pricing tiers (name, price like "Free" or "₹199/mo", one-line note), exactly 3 FAQ pairs, and 3 name options including the chosen name. Plain human words. No clichés: never use seamless, supercharge, elevate, unlock, revolutionise, or "AI-powered". Prices are sample prices.' }] }] };
    return Promise.race([
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { if (!r.ok) { var e = new Error('Gemini HTTP ' + r.status); e.status = r.status; throw e; } return r.json(); })
        .then(function (j) {
          var text = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0] && j.candidates[0].content.parts[0].text;
          if (!text) throw new Error('Gemini returned no text');
          return JSON.parse(text);
        }),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, LIVE_TIMEOUT_MS); })
    ]);
  }

  function liveGenerate(prompt) {
    return geminiGenerate(prompt, MODEL).catch(function (err) {
      if (err && err.status === 404) return geminiGenerate(prompt, FALLBACK_MODEL).then(function (d) { d._model = FALLBACK_MODEL; return d; });
      throw err;
    }).then(function (data) {
      var h = OPL.hashString(prompt);
      var palette = OPL.PALETTES[h % OPL.PALETTES.length];
      var template = OPL.TEMPLATES[h % OPL.TEMPLATES.length];
      var l = {
        id: 'launch_' + Date.now().toString(36), slug: OPL.slugify(data.name || 'startup'),
        prompt: prompt, name: data.name, nameOptions: data.nameOptions && data.nameOptions.length ? data.nameOptions : [data.name],
        tagline: data.tagline, description: data.description,
        features: data.features.slice(0, 3), pricing: data.pricing.slice(0, 3), faq: data.faq.slice(0, 3),
        palette: palette, template: template, logo: null,
        source: 'gemini', model: data._model || MODEL, createdAt: new Date().toISOString()
      };
      var errs = OPL.validateLaunch(l);
      if (errs.length) throw new Error('Live result failed validation: ' + errs.join(', '));
      l.logo = OPL.makeLogoSVG(l.name, l.palette);
      return l;
    });
  }

  /* ---------- launch flow ---------- */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function uniqueSlug(base) {
    var slug = base, n = 2;
    while (launches.some(function (l) { return l.slug === slug; })) { slug = base + '-' + n; n++; }
    return slug;
  }

  function showResult(l) {
    current = l;
    $('result').classList.add('show');
    $('result-name').textContent = l.name;
    $('result-tagline').textContent = l.tagline;
    $('result-logo').innerHTML = l.logo ? l.logo.svg : '';
    $('result-logo-src').textContent = 'Logo: ' + (l.logo ? l.logo.source : '—') + ' · shape: ' + (l.logo ? l.logo.shape : '—');
    $('result-source').textContent = l.source === 'gemini' ? 'Made with Gemini ' + (l.model || MODEL)
      : l.source === 'cached' ? 'Pre-made launch' : 'Made offline — no key';
    $('edit-name').value = l.name;
    $('edit-tagline').value = l.tagline;
    renderTemplateSegs(); renderSwatches(); renderPreview();
    $('published-url').textContent = location.origin === 'null' || location.protocol === 'file:'
      ? 'this file, then #/p/' + l.slug : location.origin + location.pathname + '#/p/' + l.slug;
    paintCount();
  }
  function renderTemplateSegs() {
    document.querySelectorAll('[data-template]').forEach(function (b) { b.classList.toggle('active', current && b.dataset.template === current.template); });
  }
  function renderSwatches() {
    $('swatches').innerHTML = OPL.PALETTES.map(function (p, i) {
      return '<button class="swatch' + (current && current.palette.name === p.name ? ' active' : '') + '" data-palette="' + i + '" title="' + p.name + '" aria-label="Palette ' + p.name + '" style="background:' + p.accent + '"></button>';
    }).join('');
    document.querySelectorAll('[data-palette]').forEach(function (b) {
      b.addEventListener('click', function () {
        current.palette = OPL.PALETTES[+b.dataset.palette];
        current.logo = OPL.makeLogoSVG(current.name, current.palette);
        persistCurrent(); showResult(current);
      });
    });
  }
  function persistCurrent() {
    var i = launches.findIndex(function (l) { return l.id === current.id; });
    if (i >= 0) launches[i] = current; else launches.unshift(current);
    saveLaunches(launches); renderLibrary(); renderAdminSelect();
  }
  function renderPreview() {
    if (!current) return;
    $('preview').innerHTML = OPL.renderLaunchBody(current);
    wireWaitlistForm($('preview'), current.slug);
    paintCount();
  }
  function paintCount() {
    if (!current) return;
    var n = getWaitlist(current.slug).length;
    var el = $('published-count'); if (el) el.textContent = n === 0 ? 'Waitlist: 0 signups yet — be the first.' : 'Waitlist: ' + n + ' real signup' + (n === 1 ? '' : 's') + '.';
    var c = document.querySelector('#preview [data-waitlist-count]');
    if (c) c.textContent = n + ' on the waitlist';
    var c2 = document.querySelector('#page-view [data-waitlist-count]');
    if (c2) c2.textContent = n + ' on the waitlist';
  }

  function wireWaitlistForm(scope, slug) {
    var form = scope.querySelector('[data-waitlist-form]');
    if (!form || form._wired) return; form._wired = true;
    var msg = scope.querySelector('[data-waitlist-msg]');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = form.email.value.trim().toLowerCase();
      if (!OPL.validateEmail(email)) { msg.textContent = 'That email doesn\'t look right — check it and try again.'; return; }
      var list = getWaitlist(slug);
      if (list.some(function (x) { return x.email === email; })) { msg.textContent = 'You\'re already on the list — we\'ll write to ' + email + '.'; return; }
      var entry = { email: email, ts: new Date().toISOString(), source: serverMode ? 'server' : 'local' };
      list.push(entry); setWaitlist(slug, list);
      msg.textContent = 'You\'re in. You are #' + list.length + ' on the list.';
      form.email.value = '';
      paintCount(); renderLibrary(); renderAdmin();
      if (serverMode) fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: slug, email: email }) }).catch(function () {});
      if (settings.supabaseUrl && settings.supabaseAnonKey) {
        fetch(settings.supabaseUrl.replace(/\/$/, '') + '/rest/v1/waitlist', { method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: settings.supabaseAnonKey, Authorization: 'Bearer ' + settings.supabaseAnonKey, Prefer: 'return=minimal' },
          body: JSON.stringify({ email: email, slug: slug }) }).catch(function () {});
      }
    });
  }

  function runLaunch(prompt) {
    var btn = $('launch-btn'); btn.disabled = true;
    $('prompt-error').textContent = '';
    renderRail(0);
    var live = !!settings.geminiKey;
    $('rail-note').textContent = live ? 'Live run — calling Gemini ' + MODEL + '. If it takes over 20 seconds, the offline builder takes over and says so.' : 'No Gemini key saved — building offline. Add a key in Settings for live copy.';
    setStatus(live ? 'Calling Gemini…' : 'Building offline…');
    var steps = [0, 1, 2, 3, 4];
    var stepTimer = setInterval(function () { /* rail advances on real completion below */ }, 1000);
    var gen = live ? liveGenerate(prompt) : Promise.resolve(null);
    var chain = Promise.resolve();
    if (live) {
      chain = chain.then(function () { renderRail(0); setStatus('Naming…'); return gen.then(function (l) { renderRail(2); return l; }).catch(function (err) { throw err; }); });
    }
    chain.then(function (liveLaunch) {
      var l;
      if (liveLaunch) { l = liveLaunch; setStatus('Live copy received — drawing logo…'); }
      else {
        renderRail(1); setStatus('Writing copy…');
        l = OPL.offlineGenerate(prompt);
        l.logo = OPL.makeLogoSVG(l.name, l.palette);
        if (live) { /* live failed — handled below */ }
      }
      renderRail(3); setStatus('Building page…');
      return sleep(liveLaunch ? 150 : 350).then(function () { return l; });
    }).catch(function (err) {
      // Live failed: fall back offline, honestly.
      setStatus('Live call failed (' + (err && err.message ? err.message : 'unknown error') + ') — built it offline instead.');
      var l = OPL.offlineGenerate(prompt);
      l.logo = OPL.makeLogoSVG(l.name, l.palette);
      return l;
    }).then(function (l) {
      renderRail(4); setStatus('Publishing…');
      l.slug = uniqueSlug(l.slug);
      return sleep(200).then(function () { return l; });
    }).then(function (l) {
      clearInterval(stepTimer);
      renderRail(5);
      $('rail-note').textContent = l.source === 'gemini' ? 'Done — live copy from Gemini ' + (l.model || MODEL) + '.' : 'Done — built offline. Same page, same waitlist; add a key in Settings for live copy.';
      setStatus(l.source === 'gemini' ? 'Live launch ready.' : 'Offline launch ready.');
      var existing = launches.findIndex(function (x) { return x.slug === l.slug; });
      if (existing < 0) { launches.unshift(l); saveLaunches(launches); }
      showResult(l); renderLibrary(); renderAdminSelect();
      btn.disabled = false;
    });
  }

  /* ---------- views / routing ---------- */
  function showView(name) {
    ['launch', 'library', 'admin', 'settings', 'page'].forEach(function (v) {
      var el = $('view-' + v); if (el) el.classList.toggle('show', v === name);
    });
    document.querySelectorAll('[data-nav]').forEach(function (b) { b.classList.toggle('active', b.dataset.nav === name); });
    if (name === 'library') renderLibrary();
    if (name === 'admin') renderAdmin();
  }
  function route() {
    var hash = location.hash || '#/';
    if (hash.indexOf('#/p/') === 0) {
      var slug = decodeURIComponent(hash.slice(4).split('?')[0]);
      var l = launches.find(function (x) { return x.slug === slug; });
      if (l) {
        current = l; showView('page');
        $('page-view').innerHTML = OPL.renderLaunchBody(l);
        wireWaitlistForm($('page-view'), l.slug);
        var c = document.querySelector('#page-view [data-waitlist-count]');
        if (c) c.textContent = getWaitlist(l.slug).length + ' on the waitlist';
        $('page-source').textContent = l.source === 'gemini' ? 'Made with Gemini ' + (l.model || MODEL) : l.source === 'cached' ? 'Pre-made launch' : 'Made offline — no key';
        $('page-admin-link').href = '#/admin';
        return;
      }
    }
    if (hash === '#/library') showView('library');
    else if (hash === '#/admin') showView('admin');
    else if (hash === '#/settings') showView('settings');
    else showView('launch');
  }

  /* ---------- library / admin ---------- */
  function renderLibrary() {
    var wrap = $('library-cards'); if (!wrap) return;
    $('library-empty').hidden = launches.length > 0;
    wrap.innerHTML = launches.map(function (l) {
      var n = getWaitlist(l.slug).length;
      return '<article class="card"><h3>' + OPL.escapeHtml(l.name) + '</h3>' +
        '<p>' + OPL.escapeHtml(l.tagline) + '</p>' +
        '<p class="small">Template: ' + OPL.TEMPLATE_LABELS[l.template] + ' · Palette: ' + OPL.escapeHtml(l.palette.name) +
        ' · ' + (l.source === 'gemini' ? 'Gemini ' + OPL.escapeHtml(l.model || '') : l.source === 'cached' ? 'Pre-made' : 'Offline') + '</p>' +
        '<p><span class="count-pill">' + n + ' on the waitlist</span></p>' +
        '<div class="row"><button class="btn btn-small" data-open="' + l.slug + '">Open page</button>' +
        '<button class="btn-ghost btn-small" data-edit="' + l.slug + '">Edit in launcher</button>' +
        '<button class="btn-ghost btn-small" data-del="' + l.slug + '">Delete</button></div></article>';
    }).join('');
    wrap.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { location.hash = '#/p/' + b.dataset.open; }); });
    wrap.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () {
      var l = launches.find(function (x) { return x.slug === b.dataset.edit; }); if (!l) return;
      location.hash = '#/'; showResult(l); $('prompt').value = l.prompt; window.scrollTo(0, 0);
    }); });
    wrap.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
      if (!confirm('Delete this launch? Its waitlist stays in this browser unless you clear it in Admin.')) return;
      launches = launches.filter(function (x) { return x.slug !== b.dataset.del; });
      saveLaunches(launches); renderLibrary(); renderAdminSelect();
    }); });
  }
  function renderAdminSelect() {
    var sel = $('admin-select'); if (!sel) return;
    var prev = sel.value;
    sel.innerHTML = launches.map(function (l) { return '<option value="' + l.slug + '">' + OPL.escapeHtml(l.name) + ' — ' + OPL.escapeHtml(l.slug) + '</option>'; }).join('');
    if (prev && launches.some(function (l) { return l.slug === prev; })) sel.value = prev;
    renderAdmin();
  }
  function renderAdmin() {
    var sel = $('admin-select'); if (!sel || !sel.value) return;
    var slug = sel.value;
    var list = getWaitlist(slug);
    var l = launches.find(function (x) { return x.slug === slug; });
    $('admin-count').textContent = list.length === 0
      ? (l ? l.name : slug) + ': 0 signups yet.'
      : (l ? l.name : slug) + ': ' + list.length + ' real signup' + (list.length === 1 ? '' : 's') + '.';
    $('admin-table-wrap').innerHTML = list.length === 0
      ? '<div class="empty">Nobody has joined this waitlist yet. Share the published page link and the first signup will show up here.</div>'
      : '<table><thead><tr><th>#</th><th>Email</th><th>Joined</th><th>Source</th></tr></thead><tbody>' +
        list.map(function (e, i) { return '<tr><td>' + (i + 1) + '</td><td>' + OPL.escapeHtml(e.email) + '</td><td>' + new Date(e.ts).toLocaleString() + '</td><td>' + OPL.escapeHtml(e.source || 'local') + '</td></tr>'; }).join('') + '</tbody></table>';
  }

  /* ---------- events ---------- */
  function init() {
    document.getElementById('lp-style').textContent = OPL.LP_CSS;
    renderRail('idle');
    var promptEl = $('prompt'), countEl = $('char-count');
    promptEl.addEventListener('input', function () {
      var n = promptEl.value.length;
      countEl.textContent = n + ' / 280';
      countEl.classList.toggle('over', n > 280);
    });
    document.querySelectorAll('[data-example]').forEach(function (b) {
      b.addEventListener('click', function () { promptEl.value = b.dataset.example; promptEl.dispatchEvent(new Event('input')); promptEl.focus(); });
    });
    function submit() {
      var text = promptEl.value.trim();
      if (!text) { $('prompt-error').textContent = 'Type one sentence first — even a rough one works.'; return; }
      if (text.length > 280) { $('prompt-error').textContent = 'That is over 280 characters — I used the first 280.'; text = text.slice(0, 280); }
      runLaunch(text);
    }
    $('launch-btn').addEventListener('click', submit);
    promptEl.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(); });

    document.querySelectorAll('[data-template]').forEach(function (b) {
      b.addEventListener('click', function () { if (!current) return; current.template = b.dataset.template; persistCurrent(); showResult(current); });
    });
    $('btn-apply-edit').addEventListener('click', function () {
      if (!current) return;
      var name = $('edit-name').value.trim(), tag = $('edit-tagline').value.trim();
      if (!name) { alert('The name cannot be empty.'); return; }
      current.name = name; current.tagline = tag || current.tagline;
      current.slug = uniqueSlug(OPL.slugify(name));
      current.logo = OPL.makeLogoSVG(current.name, current.palette);
      persistCurrent(); showResult(current);
    });
    $('btn-copy-link').addEventListener('click', function () {
      if (!current) return;
      var url = location.protocol === 'file:' ? location.href.split('#')[0] + '#/p/' + current.slug : location.origin + location.pathname + '#/p/' + current.slug;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        function () { setStatus('Link copied: ' + url); },
        function () { prompt('Copy this link:', url); });
    });
    $('btn-open-page').addEventListener('click', function () { if (current) location.hash = '#/p/' + current.slug; });
    $('btn-download-html').addEventListener('click', function () {
      if (!current) return;
      download(current.slug + '.html', OPL.standaloneHTML(current), 'text/html');
    });
    $('btn-download-logo').addEventListener('click', function () {
      if (!current || !current.logo) return;
      download(current.slug + '-logo.svg', current.logo.svg, 'image/svg+xml');
    });
    $('btn-back').addEventListener('click', function () { location.hash = '#/'; });

    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = b.dataset.nav === 'launch' ? '#/' : '#/' + b.dataset.nav; });
    });
    $('admin-select').addEventListener('change', renderAdmin);
    $('btn-export-csv').addEventListener('click', function () {
      var slug = $('admin-select').value; if (!slug) return;
      var list = getWaitlist(slug);
      var csv = 'email,joined,source\n' + list.map(function (e) { return '"' + e.email + '","' + e.ts + '","' + (e.source || 'local') + '"'; }).join('\n');
      download(slug + '-waitlist.csv', csv, 'text/csv');
    });
    $('btn-clear-waitlist').addEventListener('click', function () {
      var slug = $('admin-select').value; if (!slug) return;
      if (!confirm('Clear all signups for this launch? This cannot be undone.')) return;
      setWaitlist(slug, []); renderAdmin(); renderLibrary(); paintCount();
    });

    // Settings
    if (settings.geminiKey) { $('gemini-key').value = settings.geminiKey; $('key-status').textContent = 'A key is saved in this browser.'; }
    if (settings.supabaseUrl) $('sb-url').value = settings.supabaseUrl;
    if (settings.supabaseAnonKey) $('sb-key').value = settings.supabaseAnonKey;
    $('btn-save-key').addEventListener('click', function () {
      settings.geminiKey = $('gemini-key').value.trim(); saveSettings(settings);
      $('key-status').textContent = settings.geminiKey ? 'Key saved in this browser only.' : 'Key cleared.';
    });
    $('btn-clear-key').addEventListener('click', function () {
      settings.geminiKey = ''; $('gemini-key').value = ''; saveSettings(settings);
      $('key-status').textContent = 'Key removed. Launches will build offline.';
    });
    $('btn-test-key').addEventListener('click', function () {
      var key = $('gemini-key').value.trim();
      if (!key) { $('key-status').textContent = 'Paste a key first.'; return; }
      settings.geminiKey = key; saveSettings(settings);
      $('key-status').textContent = 'Testing…';
      geminiGenerate('a notebook app for students', MODEL).then(function () {
        $('key-status').textContent = 'Key works — Gemini ' + MODEL + ' answered.';
      }).catch(function (err) {
        $('key-status').textContent = 'Key test failed: ' + (err && err.message ? err.message : err) + '. Check the key, or leave it empty and build offline.';
      });
    });
    $('btn-save-sb').addEventListener('click', function () {
      settings.supabaseUrl = $('sb-url').value.trim(); settings.supabaseAnonKey = $('sb-key').value.trim(); saveSettings(settings);
      $('sb-status').textContent = settings.supabaseUrl ? 'Supabase settings saved.' : 'Supabase settings cleared — local waitlist is the default.';
    });
    $('btn-clear-sb').addEventListener('click', function () {
      settings.supabaseUrl = ''; settings.supabaseAnonKey = ''; $('sb-url').value = ''; $('sb-key').value = ''; saveSettings(settings);
      $('sb-status').textContent = 'Supabase removed. Local waitlist is the default.';
    });

    // Detect optional local server
    fetch('/api/health').then(function (r) { if (r.ok) serverMode = true; }).catch(function () {});

    renderLibrary(); renderAdminSelect();
    window.addEventListener('hashchange', route);
    route();
    // ?demo=<one sentence> — fills the prompt and runs the offline builder.
    // Handy on stage and for screenshots: ?demo=a%20meal-planning%20app...
    var demo = new URLSearchParams(location.search).get('demo');
    if (demo) { promptEl.value = demo; promptEl.dispatchEvent(new Event('input')); submit(); }
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
