/* One-Prompt Startup Launcher — pure generator logic.
   No DOM, no network. Works in the browser and under Node tests.
   UMD: window.OPL in browser, module.exports under Node. */
(function (root) {
  'use strict';

  var PALETTES = [
    { name: 'Lime',   bg: '#FAFAF7', ink: '#16181A', accent: '#65A30D', accentSoft: '#ECFCCB', muted: '#57534E' },
    { name: 'Amber',  bg: '#FFFBEB', ink: '#1C1917', accent: '#B45309', accentSoft: '#FEF3C7', muted: '#57534E' },
    { name: 'Sky',    bg: '#F0F9FF', ink: '#0F172A', accent: '#0369A1', accentSoft: '#E0F2FE', muted: '#475569' }
  ];
  var TEMPLATES = ['poster', 'split', 'stack'];
  var TEMPLATE_LABELS = { poster: 'Poster', split: 'Split', stack: 'Stack' };

  var STOP = new Set(('a an the for of to in on with that this is are was were be by at from as and or it its your you we our they their his her he she i me my do does did will would can could should have has had not no yes if but so than then when where who what which how all any some more most other into over under out up down about after before between through during each few many much own same such too very just also because until while per via using use used uses app apps website web platform tool service'.split(' ')));

  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function slugify(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'startup';
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function keywords(prompt) {
    return (prompt || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/).filter(function (w) { return w.length > 2 && !STOP.has(w); });
  }

  var NAME_MAP = {
    meal: 'Mealwise', food: 'Mealwise', pantry: 'Shelfie', cook: 'Shelfie',
    tutor: 'Tutorloop', doubt: 'Tutorloop', senior: 'Tutorloop', study: 'Studyloop', hostel: 'Hostelhub',
    fitness: 'Fitloop', gym: 'Fitloop', budget: 'Budgetwise', money: 'Moneywise',
    plant: 'Plantwise', garden: 'Plantwise', travel: 'Tripwise', trip: 'Tripwise',
    pet: 'Petloop', dog: 'Petloop', music: 'Tunewise', book: 'Bookwise',
    job: 'Jobwise', hire: 'Hireloop', rent: 'Rentwise', room: 'Roomwise',
    health: 'Healthwise', sleep: 'Sleepwise', habit: 'Habitloop', note: 'Notewise',
    photo: 'Photoloop', video: 'Reelwise', shop: 'Shopwise', sell: 'Sellwise',
    code: 'Codewise', bug: 'Bugwise', farm: 'Farmwise', crop: 'Cropwise'
  };
  var SUFFIXES = ['wise', 'loop', 'hub', 'base', 'ly', 'lab', 'yard', 'kit'];

  function offlineName(prompt) {
    var kws = keywords(prompt);
    for (var i = 0; i < kws.length; i++) if (NAME_MAP[kws[i]]) return NAME_MAP[kws[i]];
    if (!kws.length) return 'Newloop';
    var base = kws[0].replace(/(ing|ers|es|s)$/, '');
    return cap(base) + SUFFIXES[hashString(prompt) % SUFFIXES.length];
  }

  function offlineGenerate(prompt) {
    var clean = (prompt || '').trim().replace(/\s+/g, ' ');
    var kws = keywords(clean);
    var topic = kws.slice(0, 2).join(' ') || 'your idea';
    var name = offlineName(clean);
    var h = hashString(clean);
    var palette = PALETTES[h % PALETTES.length];
    var template = TEMPLATES[h % TEMPLATES.length];
    var first = kws[0] || 'thing';
    var tagline = 'A simple way to handle ' + topic + ' — built for people who just want it done.';
    return {
      id: 'launch_' + Date.now().toString(36) + h.toString(36).slice(0, 4),
      slug: slugify(name),
      prompt: clean,
      name: name,
      nameOptions: [name],
      tagline: tagline,
      description: 'You described: "' + clean + '". ' + name + ' turns that into one place to get it done, without the setup, the settings, or the learning curve.',
      features: [
        { title: 'Start in a minute', text: 'No setup, no tutorial. Open ' + name + ' and your ' + first + ' is ready to go.' },
        { title: 'Made for ' + topic, text: 'Every screen is built around ' + topic + ' — nothing extra, nothing in the way.' },
        { title: 'Keeps your place', text: 'Come back tomorrow and everything is where you left it.' }
      ],
      pricing: [
        { name: 'Start', price: 'Free', note: 'For trying it out' },
        { name: 'Plus', price: '₹199/mo', note: 'For regular use' },
        { name: 'Team', price: '₹499/mo', note: 'For small groups' }
      ],
      faq: [
        { q: 'What does ' + name + ' do?', a: 'It handles ' + topic + ' in one place, so you stop juggling tabs and notes.' },
        { q: 'Do I need to install anything?', a: 'No. It runs in the browser.' },
        { q: 'Is there a free plan?', a: 'Yes — the Start plan is free, with no card needed.' }
      ],
      palette: palette,
      template: template,
      logo: null, // filled by makeLogo after
      source: 'offline',
      model: null,
      createdAt: new Date().toISOString()
    };
  }

  function initials(name) {
    var words = (name || 'N').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function makeLogoSVG(name, palette) {
    var h = hashString(name || 'x');
    var shape = h % 4;
    var a = palette.accent, bg = palette.bg;
    var mark = '';
    if (shape === 0) mark = '<circle cx="48" cy="48" r="34" fill="' + a + '"/><circle cx="48" cy="48" r="14" fill="' + bg + '"/>';
    else if (shape === 1) mark = '<rect x="18" y="18" width="60" height="60" rx="14" fill="' + a + '"/><rect x="34" y="34" width="28" height="28" rx="6" fill="' + bg + '"/>';
    else if (shape === 2) mark = '<path d="M48 14 L82 82 L14 82 Z" fill="' + a + '"/><circle cx="48" cy="62" r="10" fill="' + bg + '"/>';
    else mark = '<rect x="18" y="18" width="60" height="60" rx="30" fill="' + a + '"/><rect x="18" y="44" width="60" height="8" fill="' + bg + '"/>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="' +
      name.replace(/"/g, '') + ' logo"><rect width="96" height="96" rx="20" fill="' + bg + '"/>' + mark + '</svg>';
    return { svg: svg, shape: ['ring', 'square', 'triangle', 'bar'][shape], source: 'svg-generator' };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function validateLaunch(l) {
    var errs = [];
    if (!l || typeof l !== 'object') return ['not an object'];
    if (!l.name || typeof l.name !== 'string') errs.push('missing name');
    if (!l.tagline || typeof l.tagline !== 'string') errs.push('missing tagline');
    if (!Array.isArray(l.features) || l.features.length < 3) errs.push('needs 3 features');
    else l.features.forEach(function (f, i) { if (!f.title || !f.text) errs.push('feature ' + i + ' incomplete'); });
    if (!Array.isArray(l.pricing) || l.pricing.length < 3) errs.push('needs 3 pricing tiers');
    if (!Array.isArray(l.faq) || l.faq.length < 3) errs.push('needs 3 FAQ items');
    if (!l.palette || !l.palette.bg || !l.palette.ink || !l.palette.accent) errs.push('missing palette');
    if (TEMPLATES.indexOf(l.template) === -1) errs.push('bad template');
    if (!l.slug) errs.push('missing slug');
    return errs;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
  }

  /* Render the generated landing page body (scoped .lp- classes). */
  function renderLaunchBody(l) {
    var p = l.palette, e = escapeHtml;
    var feats = l.features.map(function (f) {
      return '<div class="lp-feat"><h3>' + e(f.title) + '</h3><p>' + e(f.text) + '</p></div>';
    }).join('');
    var pricing = l.pricing.map(function (t) {
      return '<div class="lp-tier"><div class="lp-tier-name">' + e(t.name) + '</div><div class="lp-tier-price">' + e(t.price) + '</div><div class="lp-tier-note">' + e(t.note) + '</div></div>';
    }).join('');
    var faq = l.faq.map(function (f) {
      return '<details class="lp-faq-item"><summary>' + e(f.q) + '</summary><p>' + e(f.a) + '</p></details>';
    }).join('');
    var logo = l.logo && l.logo.svg ? '<span class="lp-logo">' + l.logo.svg + '</span>' : '';
    var waitlist = '<form class="lp-waitlist" data-waitlist-form><label for="lp-email">Join the waitlist</label>' +
      '<div class="lp-waitlist-row"><input id="lp-email" name="email" type="email" placeholder="you@example.com" required autocomplete="email">' +
      '<button type="submit">Join</button></div>' +
      '<p class="lp-waitlist-msg" data-waitlist-msg></p></form>';
    var foot = '<footer class="lp-foot"><span>' + e(l.name) + ' — made with One-Prompt Startup Launcher</span><span data-waitlist-count></span></footer>';
    if (l.template === 'split') {
      return '<div class="lp lp-split" style="--lp-bg:' + p.bg + ';--lp-ink:' + p.ink + ';--lp-accent:' + p.accent + ';--lp-soft:' + p.accentSoft + ';--lp-muted:' + p.muted + '">' +
        '<header class="lp-top">' + logo + '<span class="lp-name">' + e(l.name) + '</span></header>' +
        '<div class="lp-split-grid"><div><h1>' + e(l.tagline) + '</h1><p class="lp-desc">' + e(l.description) + '</p>' + waitlist + '</div>' +
        '<div class="lp-split-side"><div class="lp-feat-list">' + feats + '</div></div></div>' +
        '<section><h2>Plans</h2><div class="lp-tiers">' + pricing + '</div><p class="lp-sample-note">Sample pricing — set your real prices before you charge anyone.</p></section>' +
        '<section><h2>Questions</h2>' + faq + '</section>' + foot + '</div>';
    }
    if (l.template === 'stack') {
      return '<div class="lp lp-stack" style="--lp-bg:' + p.bg + ';--lp-ink:' + p.ink + ';--lp-accent:' + p.accent + ';--lp-soft:' + p.accentSoft + ';--lp-muted:' + p.muted + '">' +
        '<header class="lp-top lp-top-center">' + logo + '<span class="lp-name">' + e(l.name) + '</span></header>' +
        '<h1>' + e(l.tagline) + '</h1><p class="lp-desc">' + e(l.description) + '</p>' + waitlist +
        '<section><h2>What it does</h2><div class="lp-feats">' + feats + '</div></section>' +
        '<section><h2>Plans</h2><div class="lp-tiers">' + pricing + '</div><p class="lp-sample-note">Sample pricing — set your real prices before you charge anyone.</p></section>' +
        '<section><h2>Questions</h2>' + faq + '</section>' + foot + '</div>';
    }
    return '<div class="lp lp-poster" style="--lp-bg:' + p.bg + ';--lp-ink:' + p.ink + ';--lp-accent:' + p.accent + ';--lp-soft:' + p.accentSoft + ';--lp-muted:' + p.muted + '">' +
      '<header class="lp-top">' + logo + '<span class="lp-name">' + e(l.name) + '</span><span class="lp-badge">' + e(p.name) + ' palette</span></header>' +
      '<h1>' + e(l.tagline) + '</h1><p class="lp-desc">' + e(l.description) + '</p>' + waitlist +
      '<section><h2>What it does</h2><div class="lp-feats">' + feats + '</div></section>' +
      '<section><h2>Plans</h2><div class="lp-tiers">' + pricing + '</div><p class="lp-sample-note">Sample pricing — set your real prices before you charge anyone.</p></section>' +
      '<section><h2>Questions</h2>' + faq + '</section>' + foot + '</div>';
  }

  function standaloneHTML(l) {
    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + escapeHtml(l.name) + ' — ' + escapeHtml(l.tagline) + '</title>\n<style>\n' + LP_CSS + '\n</style>\n</head>\n<body>\n' +
      renderLaunchBody(l) +
      '\n<script>\n// Waitlist in this standalone file stores signups in this browser only.\n' +
      'var f=document.querySelector("[data-waitlist-form]");var m=document.querySelector("[data-waitlist-msg]");' +
      'var key="opl_waitlist_' + l.slug.replace(/"/g, '') + '";' +
      'function count(){try{return JSON.parse(localStorage.getItem(key)||"[]").length}catch(e){return 0}}\n' +
      'function paint(){var c=document.querySelector("[data-waitlist-count]");if(c)c.textContent=count()+" on the waitlist";}\n' +
      'paint();\n' +
      'if(f)f.addEventListener("submit",function(ev){ev.preventDefault();var em=f.email.value.trim();' +
      'if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(em)){m.textContent="That email doesn\'t look right — check it and try again.";return;}' +
      'var list=[];try{list=JSON.parse(localStorage.getItem(key)||"[]")}catch(e){}' +
      'if(list.some(function(x){return x.email===em})){m.textContent="You\'re already on the list.";return;}' +
      'list.push({email:em,ts:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(list));' +
      'm.textContent="You\'re in. You are #"+list.length+" on the list.";paint();f.email.value="";});\n</script>\n</body>\n</html>\n';
  }

  var LP_CSS = [
    '.lp{background:var(--lp-bg);color:var(--lp-ink);font-family:Georgia,serif;max-width:880px;margin:0 auto;padding:32px 24px 48px;}',
    '.lp h1{font-family:Arial,Helvetica,sans-serif;font-size:clamp(34px,6vw,58px);line-height:1.05;letter-spacing:-0.02em;margin:28px 0 16px;max-width:18ch;}',
    '.lp h2{font-family:Arial,Helvetica,sans-serif;font-size:22px;margin:0 0 16px;}',
    '.lp section{margin-top:48px;border-top:2px solid var(--lp-ink);padding-top:24px;}',
    '.lp-top{display:flex;align-items:center;gap:12px;}',
    '.lp-top-center{justify-content:center;flex-direction:column;}',
    '.lp-logo svg{width:48px;height:48px;display:block;}',
    '.lp-name{font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:20px;}',
    '.lp-badge{margin-left:auto;font-family:Arial,Helvetica,sans-serif;font-size:12px;border:1px solid var(--lp-ink);border-radius:999px;padding:4px 10px;}',
    '.lp-desc{font-size:18px;line-height:1.6;color:var(--lp-muted);max-width:60ch;}',
    '.lp-waitlist{margin-top:28px;background:var(--lp-soft);border:1px solid var(--lp-ink);padding:20px;}',
    '.lp-waitlist label{font-family:Arial,Helvetica,sans-serif;font-weight:700;display:block;margin-bottom:10px;}',
    '.lp-waitlist-row{display:flex;gap:8px;flex-wrap:wrap;}',
    '.lp-waitlist input{flex:1;min-width:200px;padding:12px;border:1px solid var(--lp-ink);font-size:16px;background:#fff;color:#111;}',
    '.lp-waitlist button{background:var(--lp-accent);color:#fff;border:0;padding:12px 20px;font-size:16px;font-weight:700;cursor:pointer;}',
    '.lp-waitlist-msg{font-family:Arial,Helvetica,sans-serif;margin:10px 0 0;min-height:1.2em;}',
    '.lp-feats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;}',
    '.lp-feat h3{font-family:Arial,Helvetica,sans-serif;font-size:17px;margin:0 0 6px;}',
    '.lp-feat p{margin:0;line-height:1.55;color:var(--lp-muted);}',
    '.lp-feat-list{display:grid;gap:16px;}',
    '.lp-tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;}',
    '.lp-tier{border:1px solid var(--lp-ink);padding:16px;background:var(--lp-bg);}',
    '.lp-tier-name{font-family:Arial,Helvetica,sans-serif;font-weight:700;}',
    '.lp-tier-price{font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;margin:8px 0;}',
    '.lp-tier-note{color:var(--lp-muted);font-size:14px;}',
    '.lp-sample-note{font-size:13px;color:var(--lp-muted);margin-top:12px;}',
    '.lp-faq-item{border-bottom:1px solid var(--lp-muted);padding:12px 0;}',
    '.lp-faq-item summary{font-family:Arial,Helvetica,sans-serif;font-weight:700;cursor:pointer;}',
    '.lp-faq-item p{color:var(--lp-muted);line-height:1.6;}',
    '.lp-foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:48px;padding-top:16px;border-top:1px solid var(--lp-muted);font-family:Arial,Helvetica,sans-serif;font-size:13px;color:var(--lp-muted);}',
    '.lp-split-grid{display:grid;grid-template-columns:1.1fr 0.9fr;gap:32px;align-items:start;}',
    '.lp-split-side{border:1px solid var(--lp-ink);padding:20px;background:var(--lp-soft);}',
    '.lp-stack{text-align:center;}',
    '.lp-stack .lp-desc{margin-left:auto;margin-right:auto;}',
    '.lp-stack .lp-waitlist{text-align:left;max-width:560px;margin-left:auto;margin-right:auto;}',
    '.lp-stack .lp-feats,.lp-stack .lp-tiers{text-align:left;}',
    '@media (max-width:640px){.lp-split-grid{grid-template-columns:1fr;}.lp{padding:24px 16px 40px;}}'
  ].join('\n');

  var api = {
    PALETTES: PALETTES, TEMPLATES: TEMPLATES, TEMPLATE_LABELS: TEMPLATE_LABELS,
    hashString: hashString, slugify: slugify, keywords: keywords,
    offlineName: offlineName, offlineGenerate: offlineGenerate,
    makeLogoSVG: makeLogoSVG, initials: initials,
    validateLaunch: validateLaunch, validateEmail: validateEmail,
    renderLaunchBody: renderLaunchBody, standaloneHTML: standaloneHTML,
    escapeHtml: escapeHtml, LP_CSS: LP_CSS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OPL = api;
})(typeof window !== 'undefined' ? window : globalThis);
