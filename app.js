/* Local Business Schema Generator: UI. MIT License, Ahmet Tasdemir. */
(function () {
  'use strict';

  var S = window.LocalSchema;
  var STORE_KEY = 'lbsg:v1';
  var form = document.getElementById('form');
  var state = load();

  // --- persistence -------------------------------------------------------

  function load() {
    var fromHash = decodeHash(location.hash.slice(1));
    if (fromHash) return merge(fromHash);
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved) return merge(JSON.parse(saved));
    } catch (e) { /* storage blocked: start fresh */ }
    return S.defaultState();
  }

  // Fill gaps from the defaults so an older saved draft never breaks the form.
  function merge(partial) {
    var base = S.defaultState();
    Object.keys(base).forEach(function (k) {
      if (partial && partial[k] !== undefined) base[k] = partial[k];
    });
    S.DAYS.forEach(function (d) {
      if (!base.hours[d]) base.hours[d] = { mode: 'closed', opens: '', closes: '' };
    });
    return base;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function encodeHash(obj) {
    var json = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeHash(h) {
    if (!h) return null;
    try {
      var b64 = h.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return null; }
  }

  // --- building the form ---------------------------------------------------

  function buildTypePicker() {
    var sel = document.getElementById('type');
    S.TYPE_GROUPS.forEach(function (g) {
      var og = document.createElement('optgroup');
      og.label = g.label;
      g.types.forEach(function (t) {
        var o = document.createElement('option');
        o.value = t[0];
        o.textContent = t[1];
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }

  function buildHours() {
    var box = document.getElementById('hours');
    box.innerHTML = '';
    S.DAYS.forEach(function (d) {
      var row = document.createElement('div');
      row.className = 'hour-row';
      row.innerHTML =
        '<span class="day">' + d + '</span>' +
        '<select data-day="' + d + '" data-part="mode" aria-label="' + d + ' status">' +
        '<option value="open">Open</option><option value="closed">Closed</option><option value="24h">Open 24 hours</option>' +
        '</select>' +
        '<input type="time" data-day="' + d + '" data-part="opens" aria-label="' + d + ' opens">' +
        '<span class="dash">–</span>' +
        '<input type="time" data-day="' + d + '" data-part="closes" aria-label="' + d + ' closes">';
      box.appendChild(row);
    });
  }

  function fillForm() {
    form.querySelectorAll('[data-field]').forEach(function (el) {
      var v = state[el.dataset.field];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v == null ? '' : v;
    });
    S.DAYS.forEach(function (d) {
      var h = state.hours[d];
      form.querySelectorAll('[data-day="' + d + '"]').forEach(function (el) {
        el.value = h[el.dataset.part] || '';
      });
    });
    syncVisibility();
  }

  function syncVisibility() {
    document.getElementById('foodFields').hidden = !S.isFood(state.type);
    var hoursOn = !!state.includeHours;
    document.getElementById('hours').classList.toggle('off', !hoursOn);
    S.DAYS.forEach(function (d) {
      var open = state.hours[d].mode === 'open';
      form.querySelectorAll('[data-day="' + d + '"]').forEach(function (el) {
        if (el.dataset.part === 'mode') el.disabled = !hoursOn;
        else el.disabled = !hoursOn || !open;
      });
    });
  }

  // --- rendering the output ------------------------------------------------

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Light JSON syntax colouring; the text itself is what gets copied.
  function highlight(code) {
    return escapeHtml(code).replace(
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g,
      function (m, str, colon, lit, num) {
        if (str) return '<span class="' + (colon ? 'k' : 's') + '">' + str + '</span>' + (colon || '');
        if (lit) return '<span class="l">' + lit + '</span>';
        return '<span class="n">' + num + '</span>';
      });
  }

  function render() {
    var obj = S.build(state);
    var code = S.scriptTag(obj);
    var pre = document.getElementById('code');
    pre.dataset.raw = code;
    pre.innerHTML = highlight(code);

    var findings = S.validate(state);
    var counts = { error: 0, warning: 0, tip: 0 };
    findings.forEach(function (f) { counts[f.level]++; });

    var status = document.getElementById('status');
    if (counts.error) {
      status.className = 'status bad';
      status.textContent = counts.error + (counts.error === 1 ? ' error' : ' errors') + ': Google can\u2019t use this markup yet';
    } else if (counts.warning) {
      status.className = 'status warn';
      status.textContent = 'Valid · ' + counts.warning + (counts.warning === 1 ? ' improvement' : ' improvements') + ' recommended';
    } else {
      status.className = 'status good';
      status.textContent = 'Valid · looks complete';
    }

    var ul = document.getElementById('findings');
    ul.innerHTML = '';
    var order = { error: 0, warning: 1, tip: 2 };
    findings.sort(function (a, b) { return order[a.level] - order[b.level]; }).forEach(function (f) {
      var li = document.createElement('li');
      li.className = f.level;
      li.innerHTML = '<span class="tag">' + f.level + '</span> ';
      li.appendChild(document.createTextNode(f.message));
      li.addEventListener('click', function () { focusField(f.field); });
      ul.appendChild(li);
    });

    form.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });
    findings.forEach(function (f) {
      if (f.level !== 'error') return;
      var el = form.querySelector('[data-field="' + f.field + '"]');
      if (el) el.classList.add('invalid');
    });
  }

  function focusField(field) {
    var el = field === 'hours' ? form.querySelector('[data-day]') : form.querySelector('[data-field="' + field + '"]');
    if (el && !el.closest('[hidden]')) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  function update() {
    syncVisibility();
    render();
    save();
  }

  // --- events ------------------------------------------------------------------

  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);

  function onChange(e) {
    var el = e.target;
    if (el.dataset.field) {
      state[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
    } else if (el.dataset.day) {
      var h = state.hours[el.dataset.day];
      h[el.dataset.part] = el.value;
      if (el.dataset.part === 'mode' && el.value === 'open' && !h.opens && !h.closes) {
        h.opens = '09:00';
        h.closes = '17:00';
        fillForm();
      }
    }
    update();
  }

  function copyMonday(days) {
    var m = state.hours.Monday;
    days.forEach(function (d) { state.hours[d] = { mode: m.mode, opens: m.opens, closes: m.closes }; });
    fillForm();
    update();
  }

  document.getElementById('copyWeekdays').addEventListener('click', function () {
    copyMonday(['Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  });
  document.getElementById('copyAll').addEventListener('click', function () {
    copyMonday(S.DAYS.slice(1));
  });

  document.getElementById('example').addEventListener('click', function () {
    state = S.exampleState();
    fillForm();
    update();
    toast('Example loaded');
  });

  document.getElementById('reset').addEventListener('click', function () {
    if (!confirm('Clear every field?')) return;
    state = S.defaultState();
    history.replaceState(null, '', location.pathname);
    fillForm();
    update();
  });

  document.getElementById('copy').addEventListener('click', function () {
    copyText(document.getElementById('code').dataset.raw, 'Copied to clipboard');
  });

  document.getElementById('share').addEventListener('click', function () {
    var link = location.origin + location.pathname + '#' + encodeHash(state);
    history.replaceState(null, '', '#' + encodeHash(state));
    copyText(link, 'Share link copied');
  });

  function copyText(text, msg) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { fallbackCopy(text, msg); });
    } else {
      fallbackCopy(text, msg);
    }
  }

  function fallbackCopy(text, msg) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast(msg); } catch (e) { toast('Copy failed: select the code manually'); }
    document.body.removeChild(ta);
  }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  // --- start ---------------------------------------------------------------------

  buildTypePicker();
  buildHours();
  fillForm();
  render();
})();
