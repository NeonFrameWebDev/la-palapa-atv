/* La Palapa ATV'S, site motion + interactions.
   Vanilla JS. GSAP + ScrollTrigger enhance if present; degrades gracefully.
   prefers-reduced-motion honored throughout. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = typeof window.ScrollTrigger !== 'undefined';

  function $(q, s) { return (s || document).querySelector(q); }
  function $$(q, s) { return Array.prototype.slice.call((s || document).querySelectorAll(q)); }

  if (hasGSAP && hasST) { gsap.registerPlugin(ScrollTrigger); }

  /* =====================================================
     Safe storage helpers (Safari private mode etc. can throw)
     ===================================================== */
  function safeStorageGet(store, key) {
    try { return window[store] ? window[store].getItem(key) : null; } catch (e) { return null; }
  }
  function safeStorageSet(store, key, val) {
    try { if (window[store]) window[store].setItem(key, val); } catch (e) { /* no-op */ }
  }

  /* =====================================================
     i18n: EN primary, ES toggle (data-en / data-es)
     Auto-detect once, then respect localStorage + ?lang=
     ===================================================== */
  var I18N_KEY = 'lp_lang';
  function getInitialLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('lang') === 'es') return 'es';
      if (params.get('lang') === 'en') return 'en';
    } catch (e) { /* URLSearchParams not available */ }
    var stored = safeStorageGet('localStorage', I18N_KEY);
    if (stored === 'es' || stored === 'en') return stored;
    var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return nav.indexOf('es') === 0 ? 'es' : 'en';
  }

  function applyLang(lang) {
    var attr = lang === 'es' ? 'data-es' : 'data-en';
    // text content swaps — preserve child elements (icons, arrow spans, etc.) by
    // updating only the first text node when the element has children.
    function setLangContent(el, val) {
      if (el.tagName === 'TITLE') { el.textContent = val; return; }
      var hasChildEls = el.children && el.children.length > 0;
      if (!hasChildEls) { el.textContent = val; return; }
      // Find first text-node child; if missing, insert one ahead of the first element child.
      var firstText = null;
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3) { firstText = el.childNodes[i]; break; }
      }
      if (firstText) {
        // Keep a trailing space if there's a sibling element after (so text and icon don't collide).
        var needsTrailing = el.children.length > 0 && val && val.charAt(val.length - 1) !== ' ';
        firstText.nodeValue = needsTrailing ? (val + ' ') : val;
      } else {
        el.insertBefore(document.createTextNode(val + ' '), el.firstChild);
      }
    }
    $$('[data-en]').forEach(function (el) {
      var val = el.getAttribute(attr);
      if (val === null) return;
      setLangContent(el, val);
    });
    // placeholders
    $$('[data-placeholder-en]').forEach(function (el) {
      var p = el.getAttribute(lang === 'es' ? 'data-placeholder-es' : 'data-placeholder-en');
      if (p !== null) el.setAttribute('placeholder', p);
    });
    // meta description
    var meta = document.getElementById('metaDescription');
    if (meta) {
      meta.setAttribute('content', lang === 'es'
        ? 'Renta de ATV y side-by-side en Puerto Peñasco (Rocky Point). Maneja las dunas y la playa en ATVs, RZRs y Can-Ams. Abierto diario, 9 AM al atardecer. Reserva tu paseo.'
        : 'ATV and side-by-side rentals in Puerto Penasco (Rocky Point). Ride the dunes and the beach on ATVs, RZRs, and Can-Ams. Open daily, 9 AM til sunset. Reserve your ride.');
    }
    document.documentElement.lang = lang;
    safeStorageSet('localStorage', I18N_KEY, lang);
    // toggle button states (both nav + menu copies)
    $$('.lang-toggle button').forEach(function (b) {
      var active = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  var currentLang = getInitialLang();
  applyLang(currentLang);

  $$('.lang-toggle button').forEach(function (b) {
    b.addEventListener('click', function () {
      currentLang = b.getAttribute('data-lang');
      applyLang(currentLang);
    });
  });

  /* =====================================================
     Loader (per session)
     ===================================================== */
  var loader = document.getElementById('loader');
  var hero = document.getElementById('hero');
  function kickHero() { if (hero) hero.classList.add('is-loaded'); }
  function finishLoader() {
    if (loader) {
      loader.classList.add('is-done');
      setTimeout(function () { if (loader && loader.parentNode) loader.remove(); }, 700);
    }
    document.body.classList.remove('is-locked');
    kickHero();
  }

  if (loader) {
    var seen = safeStorageGet('sessionStorage', 'lp_seen') === '1';
    if (seen || reduceMotion) {
      // instant logo + fast fade for reduced motion / repeat visit
      loader.classList.add('is-ready');
      setTimeout(finishLoader, reduceMotion ? 120 : 350);
    } else {
      safeStorageSet('sessionStorage', 'lp_seen', '1');
      document.body.classList.add('is-locked');
      setTimeout(function () { loader.classList.add('is-ready'); }, 60);
      var bar = loader.querySelector('.loader__bar');
      var n = 0;
      var iv = setInterval(function () {
        n += Math.floor(Math.random() * 9) + 4;
        if (n >= 100) n = 100;
        if (bar) bar.style.width = n + '%';
        if (n >= 100) { clearInterval(iv); setTimeout(finishLoader, 280); }
      }, 55);
      setTimeout(finishLoader, 4000); // safety
    }
  } else {
    kickHero();
  }

  /* =====================================================
     Scroll progress + speedometer rail + nav solidify
     ===================================================== */
  var progressTop = document.getElementById('progressTop');
  var railFill = document.getElementById('railFill');
  var railPct = document.getElementById('railPct');
  var nav = document.getElementById('nav');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var pct = Math.min(100, Math.max(0, y / docH * 100));
    if (progressTop) progressTop.style.width = pct + '%';
    if (railFill) railFill.style.height = pct + '%';
    if (railPct) railPct.textContent = Math.round(pct);
    // Nav solidifies on scroll. On pages without a hero (subpages) it stays solid
    // at the top too, since there is no tall hero behind it.
    if (nav) {
      if (y > 20 || !hero) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =====================================================
     Mobile menu
     ===================================================== */
  var menu = document.getElementById('menu');
  var menuBtn = document.getElementById('menuBtn');
  var menuClose = document.getElementById('menuClose');
  function openMenu() {
    if (!menu) return;
    menu.classList.add('is-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
  }
  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }
  if (menuBtn) menuBtn.addEventListener('click', openMenu);
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  if (menu) $$('.menu__links a, .menu__cta a', menu).forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu && menu.classList.contains('is-open')) closeMenu();
  });

  /* =====================================================
     Smooth anchor scroll with nav offset
     ===================================================== */
  function navOffset() { return (window.matchMedia('(min-width: 900px)').matches ? 72 : 64) + 12; }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - navOffset();
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* =====================================================
     Fleet card "Reserve this one" -> pre-select vehicle
     ===================================================== */
  function preselectVehicle(key) {
    var input = document.querySelector('.vehicle-pills input[data-key="' + key + '"]');
    if (input) {
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  // Same-page fleet cards (only present if the fleet section is on this page).
  $$('.fleet-card__reserve[data-vehicle]').forEach(function (a) {
    a.addEventListener('click', function () { preselectVehicle(a.getAttribute('data-vehicle')); });
  });
  // Cross-page deep link: reserve.html?vehicle=KEY (KEY = atv | rzr2 | rzr4 | canam).
  // Runs on every page load; preselectVehicle null-guards when the form is absent.
  (function () {
    var params = new URLSearchParams(window.location.search);
    var v = params.get('vehicle');
    if (v) preselectVehicle(v);
  })();

  /* =====================================================
     Reveal on scroll (.rise)
     ===================================================== */
  if (reduceMotion) {
    $$('.rise').forEach(function (el) { el.classList.add('is-in'); });
  } else if (hasGSAP && hasST) {
    $$('.rise').forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { el.classList.add('is-in'); } });
    });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    $$('.rise').forEach(function (el) { io.observe(el); });
  } else {
    $$('.rise').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* =====================================================
     Light parallax on big section photos (desktop, motion ok)
     ===================================================== */
  if (hasGSAP && hasST && !reduceMotion && window.matchMedia('(min-width: 900px)').matches) {
    $$('.why__photo img').forEach(function (img) {
      gsap.to(img, {
        yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* =====================================================
     Marquee: clone children so the -50% loop is seamless
     ===================================================== */
  $$('.marquee__track').forEach(function (track) {
    if (reduceMotion) return; // leave single copy, animation already off via CSS
    Array.prototype.slice.call(track.children).forEach(function (k) { track.appendChild(k.cloneNode(true)); });
  });

  /* =====================================================
     Reserve form: min date today, stepper, validation, states
     ===================================================== */
  var form = document.getElementById('reserveForm');
  var dateInput = document.getElementById('rDate');
  if (dateInput) {
    var t = new Date();
    var iso = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    dateInput.min = iso;
  }

  // number stepper
  var riders = document.getElementById('rRiders');
  var plus = document.getElementById('ridersPlus');
  var minus = document.getElementById('ridersMinus');
  function clampRiders(v) { v = parseInt(v, 10); if (isNaN(v) || v < 1) v = 1; if (v > 20) v = 20; return v; }
  if (plus) plus.addEventListener('click', function () { riders.value = clampRiders(riders.value) + 1; clearError(riders.closest('.field')); });
  if (minus) minus.addEventListener('click', function () { riders.value = clampRiders(riders.value) - 1; clearError(riders.closest('.field')); });
  if (riders) riders.addEventListener('input', function () { riders.value = riders.value.replace(/[^0-9]/g, ''); });

  /* =====================================================
     Live price summary: vehicle rate * hours (updates as user picks)
     ===================================================== */
  function updatePriceSummary() {
    var summary = document.getElementById('priceSummary');
    if (!summary) return;
    var empty = document.getElementById('priceEmpty');
    var ready = document.getElementById('priceReady');
    var vehInput = document.querySelector('.vehicle-pills input:checked');
    var startEl = document.getElementById('rTime');
    var endEl = document.getElementById('rEndTime');
    var startVal = startEl ? startEl.value : '';
    var endVal = endEl ? endEl.value : '';
    var rate = 0, vehName = '';
    if (vehInput) {
      rate = parseInt(vehInput.getAttribute('data-rate'), 10) || 0;
      vehName = vehInput.value || '';
    }
    var hours = 0;
    if (startVal && endVal) {
      var s = parseInt(String(startVal).split(':')[0], 10);
      var e = parseInt(String(endVal).split(':')[0], 10);
      if (!isNaN(s) && !isNaN(e) && e > s) hours = e - s;
    }
    if (rate > 0 && hours > 0) {
      var total = rate * hours;
      var hLabel = currentLang === 'es'
        ? (hours === 1 ? 'hora' : 'horas')
        : (hours === 1 ? 'hr' : 'hrs');
      var detailEl = document.getElementById('priceDetail');
      var totalEl = document.getElementById('priceTotal');
      // textContent only, no HTML injection risk
      if (detailEl) detailEl.textContent = vehName + ' · ' + hours + ' ' + hLabel + ' × $' + rate;
      if (totalEl) totalEl.textContent = '$' + total + ' USD';
      if (empty) empty.hidden = true;
      if (ready) ready.hidden = false;
    } else {
      if (empty) empty.hidden = false;
      if (ready) ready.hidden = true;
    }
  }
  $$('.vehicle-pills input').forEach(function (r) {
    r.addEventListener('change', updatePriceSummary);
  });
  ['rTime', 'rEndTime'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', updatePriceSummary);
  });
  // Re-run after language toggles so 'hr/hrs' switches to 'hora/horas' and back
  $$('.lang-toggle button').forEach(function (b) {
    b.addEventListener('click', function () { setTimeout(updatePriceSummary, 0); });
  });
  // Initial paint (covers ?vehicle= deep-link preselect from the fleet cards)
  updatePriceSummary();

  function setError(field) { if (field) field.classList.add('has-error'); }
  function clearError(field) { if (field) field.classList.remove('has-error'); }

  /* The reservation Submit stays DISABLED (and shows a hint explaining why) until the
     rental waiver is signed. lockSubmit/unlockSubmit toggle that gated state. The
     ".is-locked" class distinguishes "waiting on waiver" from the in-flight "Sending..." state. */
  function lockSubmit() {
    var btn = document.getElementById('submitBtn');
    var hint = document.getElementById('submitHint');
    if (btn) { btn.disabled = true; btn.classList.add('is-locked'); }
    if (hint) hint.hidden = false;
  }
  function unlockSubmit() {
    var btn = document.getElementById('submitBtn');
    var hint = document.getElementById('submitHint');
    if (btn) { btn.disabled = false; btn.classList.remove('is-locked'); }
    if (hint) hint.hidden = true;
  }

  // clear field errors as the user fixes them
  $$('#reserveForm input, #reserveForm select, #reserveForm textarea').forEach(function (el) {
    el.addEventListener('input', function () { clearError(el.closest('.field')); clearContactError(); });
    el.addEventListener('change', function () { clearError(el.closest('.field')); clearContactError(); });
  });
  function clearContactError() {
    var phone = document.getElementById('rPhone');
    var email = document.getElementById('rEmail');
    if ((phone && phone.value.trim()) || (email && email.value.trim())) {
      var ce = document.getElementById('rContactErr');
      var f = ce ? ce.closest('.field') : null;
      if (f) f.classList.remove('has-error');
      // contact error lives on the email field; also clear phone field highlight
      if (phone) clearError(phone.closest('.field'));
    }
  }

  /* =====================================================
     Submission constants. Owner's primary line is the WhatsApp + tel fallback channel.
     When the owner provides a dedicated email, swap BOOKING_RECIPIENT_EMAIL below.
     ===================================================== */
  var BOOKING_RECIPIENT_EMAIL = 'becca@neonframewebdesign.com';
  var FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/' + BOOKING_RECIPIENT_EMAIL;
  var OWNER_PHONE_DIGITS = '526381124485'; // E.164 without +, for wa.me + tel:
  var OWNER_PHONE_DISPLAY = '638-112-4485';
  var SUBMIT_TIMEOUT_MS = 18000;
  var SUBMIT_MAX_RETRIES = 1; // one extra automatic retry for transient network failures
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  var isSubmitting = false; // hard guard against double-submits

  /* Tiny helpers */
  function safeStr(v, max) {
    if (v == null) return '';
    var s = String(v).replace(/[ -]/g, '').trim();
    if (max && s.length > max) s = s.slice(0, max);
    return s;
  }
  function digitsOnly(v) { return safeStr(v).replace(/\D+/g, ''); }
  function looksLikePhone(v) { return digitsOnly(v).length >= 7; }
  function looksLikeEmail(v) { return EMAIL_RE.test(safeStr(v)); }
  function todayISO() {
    var t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }
  function dataURLToBlob(dataURL) {
    try {
      var parts = String(dataURL || '').split(',');
      if (parts.length < 2) return null;
      var mimeMatch = parts[0].match(/data:([^;]+)/);
      var mime = mimeMatch ? mimeMatch[1] : 'image/png';
      var bin = atob(parts[1]);
      var len = bin.length;
      var arr = new Uint8Array(len);
      for (var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    } catch (err) { return null; }
  }
  function escapeHTML(s) {
    return safeStr(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ---- collect normalized booking fields (single source of truth) ---- */
  function collectBookingFields() {
    var phone = document.getElementById('rPhone');
    var email = document.getElementById('rEmail');
    var vehChecked = document.querySelector('.vehicle-pills input:checked');
    return {
      date:      safeStr(document.getElementById('rDate') && document.getElementById('rDate').value),
      startTime: safeStr(document.getElementById('rTime') && document.getElementById('rTime').value),
      endTime:   safeStr(document.getElementById('rEndTime') && document.getElementById('rEndTime').value),
      vehicle:   vehChecked ? safeStr(vehChecked.value) : '',
      riders:    riders ? clampRiders(riders.value) : 1,
      name:      safeStr(document.getElementById('rName') && document.getElementById('rName').value, 120),
      phone:     safeStr(phone && phone.value, 40),
      email:     safeStr(email && email.value, 254),
      notes:     safeStr(document.getElementById('rNotes') && document.getElementById('rNotes').value, 2000)
    };
  }

  /* ---- human-readable booking summary (for WhatsApp + mailto + auto-response) ---- */
  function buildBookingSummary(b, lang) {
    var L = lang === 'es' ? {
      title: 'Reserva La Palapa ATV',
      name: 'Nombre', phone: 'Teléfono', email: 'Correo',
      date: 'Fecha', start: 'Inicio', end: 'Fin',
      vehicle: 'Vehículo', riders: 'Pasajeros', notes: 'Notas',
      signed: 'Contrato firmado', signedYes: 'Sí, firmado digitalmente',
      none: '(ninguno)'
    } : {
      title: 'La Palapa ATV Booking',
      name: 'Name', phone: 'Phone', email: 'Email',
      date: 'Date', start: 'Start', end: 'End',
      vehicle: 'Vehicle', riders: 'Riders', notes: 'Notes',
      signed: 'Waiver signed', signedYes: 'Yes, signed digitally',
      none: '(none)'
    };
    var lines = [
      L.title,
      '',
      L.name + ': ' + (b.name || L.none),
      L.phone + ': ' + (b.phone || L.none),
      L.email + ': ' + (b.email || L.none),
      '',
      L.vehicle + ': ' + (b.vehicle || L.none),
      L.riders + ': ' + b.riders,
      L.date + ': ' + (b.date || L.none),
      L.start + ': ' + (b.startTime || L.none),
      L.end + ': ' + (b.endTime || L.none)
    ];
    if (b.notes) { lines.push(''); lines.push(L.notes + ': ' + b.notes); }
    lines.push('');
    lines.push(L.signed + ': ' + (waiverData ? L.signedYes : L.none));
    return lines.join('\n');
  }
  function buildWhatsappURL(summary) {
    return 'https://wa.me/' + OWNER_PHONE_DIGITS + '?text=' + encodeURIComponent(summary);
  }
  function buildMailtoURL(summary, b) {
    var subj = 'La Palapa Booking, ' + (b.name || 'New booking') + ' ' + b.date;
    return 'mailto:' + BOOKING_RECIPIENT_EMAIL +
      '?subject=' + encodeURIComponent(subj) +
      '&body=' + encodeURIComponent(summary);
  }

  /* ---- POST to FormSubmit.co with timeout + automatic retry on transient errors ---- */
  function postBooking(fd, attempt) {
    attempt = attempt || 0;
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) try { ctrl.abort(); } catch (e) {} }, SUBMIT_TIMEOUT_MS);
    return fetch(FORMSUBMIT_ENDPOINT, {
      method: 'POST',
      body: fd,
      headers: { 'Accept': 'application/json' },
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      // FormSubmit returns 200/302 on success, 4xx on validation, 5xx on their issues.
      if (!res.ok) {
        // 429/5xx are worth retrying once; 4xx is permanent.
        if ((res.status === 429 || res.status >= 500) && attempt < SUBMIT_MAX_RETRIES) {
          return new Promise(function (resolve) { setTimeout(resolve, 600); })
            .then(function () { return postBooking(fd, attempt + 1); });
        }
        throw new Error('formsubmit_status_' + res.status);
      }
      return res.json().catch(function () { return { success: 'true' }; });
    }, function (err) {
      clearTimeout(timer);
      var transient = err && (err.name === 'AbortError' || err.name === 'TypeError'); // network / aborted
      if (transient && attempt < SUBMIT_MAX_RETRIES) {
        return new Promise(function (resolve) { setTimeout(resolve, 600); })
          .then(function () { return postBooking(fd, attempt + 1); });
      }
      throw err;
    });
  }

  /* ---- the actual submit handler ---- */
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return;

      // honeypot: if filled, silently "succeed" without sending (bot trap)
      var honey = document.getElementById('rWebsite');
      if (honey && honey.value) { showSuccess(true); return; }

      var firstInvalid = null;

      function require(id, opts) {
        var el = document.getElementById(id);
        var field = el ? el.closest('.field') : null;
        var v = el ? safeStr(el.value) : '';
        var ok = v !== '';
        if (ok && opts && opts.minLen && v.length < opts.minLen) ok = false;
        if (!ok) { setError(field); if (!firstInvalid) firstInvalid = el; }
        else clearError(field);
        return ok;
      }

      // Date required + not in the past (HTML5 min attr is a hint; double-check on submit)
      var dateEl = document.getElementById('rDate');
      var dateField = dateEl ? dateEl.closest('.field') : null;
      var dateErr = document.getElementById('rDateErr');
      var dateVal = safeStr(dateEl && dateEl.value);
      if (!dateVal) {
        if (dateErr) { dateErr.textContent = currentLang === 'es' ? 'Escoge una fecha.' : 'Pick a date.'; }
        setError(dateField);
        if (!firstInvalid) firstInvalid = dateEl;
      } else if (dateVal < todayISO()) {
        if (dateErr) { dateErr.textContent = currentLang === 'es' ? 'Escoge una fecha de hoy o más adelante.' : 'Pick today or a future date.'; }
        setError(dateField);
        if (!firstInvalid) firstInvalid = dateEl;
      } else { clearError(dateField); }

      require('rTime');
      var nameEl = document.getElementById('rName');
      var nameOk = require('rName', { minLen: 2 });
      // Reject all-whitespace / single-char names
      if (nameOk && safeStr(nameEl.value).length < 2) {
        setError(nameEl.closest('.field'));
        if (!firstInvalid) firstInvalid = nameEl;
      }

      // End time: required, AND must be AFTER the start time.
      var startEl = document.getElementById('rTime');
      var endEl = document.getElementById('rEndTime');
      var endField = endEl ? endEl.closest('.field') : null;
      var endErr = document.getElementById('rEndTimeErr');
      var endVal = safeStr(endEl && endEl.value);
      var startVal = safeStr(startEl && startEl.value);
      if (!endVal) {
        if (endErr) { endErr.textContent = currentLang === 'es' ? 'Escoge una hora de fin.' : 'Pick an end time.'; }
        setError(endField);
        if (!firstInvalid) firstInvalid = endEl;
      } else if (startVal && endVal <= startVal) {
        if (endErr) { endErr.textContent = currentLang === 'es' ? 'La hora de fin debe ser posterior a la de inicio.' : 'End time must be after the start time.'; }
        setError(endField);
        if (!firstInvalid) firstInvalid = endEl;
      } else { clearError(endField); }

      // riders 1..20
      var ridersField = riders ? riders.closest('.field') : null;
      var ridersVal = riders ? clampRiders(riders.value) : 0;
      if (!ridersVal || ridersVal < 1) { setError(ridersField); if (!firstInvalid) firstInvalid = riders; }
      else { if (riders) riders.value = ridersVal; clearError(ridersField); }

      // vehicle radio
      var vehChecked = document.querySelector('.vehicle-pills input:checked');
      var vehPillsHost = document.querySelector('.vehicle-pills');
      var vehField = vehPillsHost ? vehPillsHost.closest('.field') : null;
      if (!vehChecked) { setError(vehField); if (!firstInvalid) firstInvalid = vehPillsHost ? vehPillsHost.querySelector('input') : null; }
      else clearError(vehField);

      // at least one of phone/email, AND if provided each must look valid
      var phone = document.getElementById('rPhone');
      var email = document.getElementById('rEmail');
      var phoneVal = safeStr(phone && phone.value);
      var emailVal = safeStr(email && email.value);
      var contactOk = false;
      if (phoneVal || emailVal) {
        var phoneOk = !phoneVal || looksLikePhone(phoneVal);
        var emailOk = !emailVal || looksLikeEmail(emailVal);
        contactOk = phoneOk && emailOk && (phoneVal || emailVal);
        if (!phoneOk) { setError(phone.closest('.field')); if (!firstInvalid) firstInvalid = phone; }
        if (!emailOk) { setError(email.closest('.field')); if (!firstInvalid) firstInvalid = email; }
      }
      if (!contactOk) {
        var contactErrEl = document.getElementById('rContactErr');
        var contactField = contactErrEl ? contactErrEl.closest('.field') : null;
        if (contactField) setError(contactField);
        if (phone && !phoneVal && !emailVal) setError(phone.closest('.field'));
        if (!firstInvalid) firstInvalid = phone;
      }

      // REQUIRED: rental waiver must be signed before the reservation can be sent
      if (!waiverData) {
        var waiverField = document.getElementById('waiverStep');
        setError(waiverField ? waiverField.closest('.field') : null);
        if (!firstInvalid) firstInvalid = document.getElementById('openWaiver');
      }

      if (firstInvalid) {
        var y = firstInvalid.getBoundingClientRect().top + window.scrollY - navOffset() - 8;
        window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
        try { firstInvalid.focus({ preventScroll: true }); } catch (err) { try { firstInvalid.focus(); } catch (e2) {} }
        return;
      }

      // ---- valid: submitting state ----
      isSubmitting = true;
      var btn = document.getElementById('submitBtn');
      var label = btn ? btn.querySelector('.btn-label') : null;
      var labelText = currentLang === 'es' ? 'Enviando...' : 'Sending...';
      if (btn) btn.disabled = true;
      if (label) {
        // Build with DOM, never innerHTML with untrusted data
        label.textContent = '';
        var sp = document.createElement('span');
        sp.className = 'spinner';
        sp.setAttribute('aria-hidden', 'true');
        label.appendChild(sp);
        label.appendChild(document.createTextNode(' ' + labelText));
      }
      var errorNotice = document.getElementById('formError');
      if (errorNotice) errorNotice.classList.remove('is-shown');

      // ---- assemble payload ----
      var booking = collectBookingFields();
      var summaryEN = buildBookingSummary(booking, 'en');
      var summaryES = buildBookingSummary(booking, 'es');
      var summary = currentLang === 'es' ? summaryES : summaryEN;

      // Auto-response shown to the customer; FormSubmit sends this to whoever's email is in `email`.
      var autoresponse = (currentLang === 'es'
        ? ('Hola ' + (booking.name || '') + ',\n\nRecibimos tu reserva en La Palapa ATV. Aquí están los detalles:\n\n' + summaryES + '\n\nTe esperamos en Puerto Peñasco. Si necesitas cambiar algo, contesta este correo o escríbenos al WhatsApp ' + OWNER_PHONE_DISPLAY + '.\n\nLa Palapa ATV')
        : ('Hi ' + (booking.name || '') + ',\n\nWe received your booking at La Palapa ATV. Here are your details:\n\n' + summaryEN + '\n\nSee you in Puerto Penasco. If anything changes, reply to this email or WhatsApp us at ' + OWNER_PHONE_DISPLAY + '.\n\nLa Palapa ATV')
      );

      // FormSubmit hidden config: subject, cc to customer, replyto, autoresponse
      var subjEl = document.getElementById('rFsSubject');
      var ccEl = document.getElementById('rFsCc');
      var replytoEl = document.getElementById('rFsReplyto');
      var autoEl = document.getElementById('rFsAutoresponse');
      if (subjEl) subjEl.value = 'La Palapa Booking: ' + (booking.name || 'New') + ' / ' + (booking.vehicle || 'vehicle') + ' / ' + (booking.date || todayISO());
      if (ccEl) ccEl.value = booking.email; // customer copy
      if (replytoEl) replytoEl.value = booking.email || ''; // replies go to customer
      if (autoEl) autoEl.value = autoresponse;

      // Build FormData. FormSubmit accepts multipart/form-data with file attachment.
      var fd = new FormData();
      // Use a label that reads cleanly in the email table:
      fd.append('Name', booking.name);
      fd.append('Phone', booking.phone);
      fd.append('Email', booking.email);
      fd.append('Vehicle', booking.vehicle);
      fd.append('Riders', String(booking.riders));
      fd.append('Date', booking.date);
      fd.append('Start time', booking.startTime);
      fd.append('End time', booking.endTime);
      fd.append('Notes', booking.notes);
      fd.append('Booking summary', summaryEN);
      // Waiver detail
      if (waiverData) {
        fd.append('Waiver signed', 'YES');
        fd.append('Waiver signer name', safeStr(waiverData.signerName, 120));
        fd.append('Waiver signature type', safeStr(waiverData.signatureType));
        fd.append('Waiver agreement', waiverData.agreement ? 'true' : 'false');
        fd.append('Waiver signed at (ISO)', safeStr(waiverData.signedAtISO));
        fd.append('Waiver signed place', safeStr(waiverData.signedPlace));
        var c = waiverData.customer || {};
        fd.append('Customer telephone', safeStr(c.telephone, 40));
        fd.append('Customer address', safeStr(c.address, 200));
        fd.append('Customer hotel', safeStr(c.hotel, 120));
        fd.append('Customer room', safeStr(c.roomNo, 20));
        fd.append('Customer check-in', safeStr(c.checkin));
        fd.append('Customer check-out', safeStr(c.checkout));
        if (waiverData.signatureType === 'drawn') {
          var blob = dataURLToBlob(waiverData.signature);
          if (blob) {
            var fname = 'signature-' + (booking.name || 'customer').replace(/[^a-z0-9_-]+/gi, '_') + '-' + (booking.date || todayISO()) + '.png';
            fd.append('signature_image', blob, fname);
          } else {
            // dataURL malformed for some reason; still include the raw value so nothing is lost
            fd.append('signature_data_url', safeStr(waiverData.signature, 100000));
          }
        } else {
          fd.append('Typed signature', safeStr(waiverData.signature, 120));
        }
      } else {
        fd.append('Waiver signed', 'NO');
      }
      // FormSubmit config (these are also present as hidden fields, FormData picks them up via the form)
      // We set them on the form already, but we append explicitly so the AJAX path doesn't lose them.
      fd.set('_subject', subjEl ? subjEl.value : 'La Palapa booking');
      fd.set('_template', 'table');
      fd.set('_captcha', 'false');
      if (booking.email) {
        fd.set('_cc', booking.email);
        fd.set('_replyto', booking.email);
      }
      fd.set('_autoresponse', autoresponse);
      // The honeypot field if present (real users empty)
      fd.set('_honey', safeStr(honey && honey.value));

      postBooking(fd).then(function () {
        isSubmitting = false;
        showSuccess(false);
      }, function (err) {
        isSubmitting = false;
        showError(booking, summary);
        // Re-enable submit so the user can try again
        if (btn) btn.disabled = false;
        if (label) label.textContent = currentLang === 'es' ? 'Reservar mi paseo' : 'Book my ride';
      });
    });
  }

  function showSuccess(silent) {
    var card = document.getElementById('reserveCard');
    var nameVal = safeStr(document.getElementById('rName') && document.getElementById('rName').value);
    var vehChecked = document.querySelector('.vehicle-pills input:checked');
    var vehName = vehChecked ? safeStr(vehChecked.value) : '';
    var dateVal = safeStr(document.getElementById('rDate') && document.getElementById('rDate').value);
    var body = document.getElementById('successBody');
    if (body) {
      // Use textContent (no HTML injection risk)
      if (currentLang === 'es') {
        body.textContent = '¡Listo' + (nameVal ? ', ' + nameVal : '') + '! Tu ' + vehName + (dateVal ? ' del ' + dateVal : '') + ' quedó reservado. Te enviamos un correo con la confirmación y una copia del contrato firmado. Nos vemos en la arena.';
      } else {
        body.textContent = 'You are booked' + (nameVal ? ', ' + nameVal : '') + '! Your ' + vehName + (dateVal ? ' for ' + dateVal : '') + ' is reserved. We sent you an email with the confirmation and a copy of the signed waiver. See you on the sand.';
      }
    }
    // Wire success WhatsApp button so customer can also ping the team
    try {
      var b = collectBookingFields();
      var summary = buildBookingSummary(b, currentLang);
      var waBtn = document.getElementById('successWhatsapp');
      if (waBtn) waBtn.setAttribute('href', buildWhatsappURL(summary));
    } catch (e) { /* never let summary build error block success */ }

    if (card) card.classList.add('is-success');
    var success = document.getElementById('reserveSuccess');
    if (success && card) {
      var y = card.getBoundingClientRect().top + window.scrollY - navOffset() - 8;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      success.setAttribute('tabindex', '-1');
      try { success.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  /* Show the structured fallback error UI with WhatsApp + mailto preserving the customer's booking */
  function showError(booking, summary) {
    var notice = document.getElementById('formError');
    if (!notice) return;
    booking = booking || collectBookingFields();
    summary = summary || buildBookingSummary(booking, currentLang);
    var wa = document.getElementById('formErrorWhatsapp');
    var ml = document.getElementById('formErrorMailto');
    if (wa) wa.setAttribute('href', buildWhatsappURL(summary));
    if (ml) ml.setAttribute('href', buildMailtoURL(summary, booking));
    notice.classList.add('is-shown');
    // bring it into view
    var y = notice.getBoundingClientRect().top + window.scrollY - navOffset() - 8;
    window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  // Retry button: hide the error UI and re-arm submit
  var formErrorRetry = document.getElementById('formErrorRetry');
  if (formErrorRetry) {
    formErrorRetry.addEventListener('click', function () {
      var notice = document.getElementById('formError');
      if (notice) notice.classList.remove('is-shown');
      var b = document.getElementById('submitBtn');
      if (b) b.disabled = false;
    });
  }
  window.__lpShowError = showError; // diagnostic hook

  // If the form was submitted natively (no JS at the time, or a network fallback) and
  // FormSubmit redirected back here with ?booked=1, show the success state on load.
  // This is a backstop so the customer is never left on a half-loaded form after success.
  try {
    var bp = new URLSearchParams(window.location.search);
    if (bp.get('booked') === '1') {
      // Strip the ?booked=1 from the URL so a refresh doesn't replay this state.
      try { history.replaceState({}, document.title, window.location.pathname); } catch (e) {}
      // Defer to after the loader so the user sees the success card cleanly.
      setTimeout(function () {
        var body = document.getElementById('successBody');
        if (body) {
          body.textContent = currentLang === 'es'
            ? '¡Tu reserva se envió! Revisa tu correo para la confirmación y una copia del contrato firmado.'
            : 'Your booking was sent! Check your email for the confirmation and a copy of the signed waiver.';
        }
        var card = document.getElementById('reserveCard');
        if (card) card.classList.add('is-success');
        var success = document.getElementById('reserveSuccess');
        if (success && card) {
          var y2 = card.getBoundingClientRect().top + window.scrollY - navOffset() - 8;
          window.scrollTo({ top: y2, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      }, 200);
    }
  } catch (e) { /* harmless if URLSearchParams not available */ }

  // reset / reserve another
  var resetBtn = document.getElementById('resetForm');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var card = document.getElementById('reserveCard');
      if (card) card.classList.remove('is-success');
      form.reset();
      if (riders) riders.value = 1;
      var btn = document.getElementById('submitBtn');
      var label = btn.querySelector('.btn-label');
      btn.disabled = false;
      label.textContent = currentLang === 'es' ? 'Reservar mi paseo' : 'Book my ride';
      $$('#reserveForm .field').forEach(function (f) { f.classList.remove('has-error'); });
      resetWaiver();
      var y = card.getBoundingClientRect().top + window.scrollY - navOffset() - 8;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* =====================================================
     Rental Agreement / Waiver modal
     Focus-trapped dialog, ESC closes, scroll-locked.
     Signature: draw-to-sign canvas (mouse + touch) OR a typed legal name
     (keyboard/accessible alternative). Either satisfies the signature.
     On sign: marks the reservation waiver status + unlocks the submit and
     stores the signed payload in `waiverData`.
     ===================================================== */
  var waiverData = null; // null until signed; set to the signed-waiver object on sign

  var waiverModal = document.getElementById('waiverModal');
  var openWaiverBtn = document.getElementById('openWaiver');
  var waiverCloseBtn = document.getElementById('waiverClose');
  var waiverCancelBtn = document.getElementById('waiverCancel');
  var waiverOverlay = document.getElementById('waiverOverlay');
  var waiverForm = document.getElementById('waiverForm');
  var waiverSignBtn = document.getElementById('waiverSign');
  var waiverAgree = document.getElementById('wAgree');
  var waiverTypedSig = document.getElementById('wTypedSig');
  var waiverCanvas = document.getElementById('waiverCanvas');
  var waiverSigClear = document.getElementById('waiverSigClear');
  var waiverCanvasWrap = waiverCanvas ? waiverCanvas.closest('.waiver__sig-canvas-wrap') : null;
  var waiverLastFocused = null;

  // signing date strings (long form, no leading-zero noise) for EN + ES
  function buildSignDate() {
    var d = new Date();
    var iso = d.toISOString();
    var enFmt, esFmt;
    try {
      enFmt = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { enFmt = d.toDateString(); }
    try {
      esFmt = d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { esFmt = enFmt; }
    return { iso: iso, en: enFmt, es: esFmt };
  }
  var signDate = buildSignDate();

  function paintSignDate() {
    var human = currentLang === 'es' ? signDate.es : signDate.en;
    var contractDate = document.getElementById('waiverContractDate');
    var signDateEl = document.getElementById('waiverSignDate');
    if (contractDate) contractDate.textContent = human;
    if (signDateEl) signDateEl.textContent = human;
  }

  /* ---- signature canvas (lightweight vanilla) ---- */
  var sigCtx = null, sigDrawing = false, sigHasInk = false, sigLastX = 0, sigLastY = 0;
  function sigSetup() {
    if (!waiverCanvas) return;
    // size the backing store to the displayed CSS size * DPR for crisp lines
    var rect = waiverCanvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    waiverCanvas.width = w * dpr;
    waiverCanvas.height = h * dpr;
    sigCtx = waiverCanvas.getContext('2d');
    sigCtx.scale(dpr, dpr);
    sigCtx.lineWidth = 2.2;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    sigCtx.strokeStyle = '#1A1A1A';
  }
  function sigPos(e) {
    var rect = waiverCanvas.getBoundingClientRect();
    var p = e.touches && e.touches[0] ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  }
  function sigStart(e) {
    if (!sigCtx) sigSetup();
    sigDrawing = true;
    var p = sigPos(e);
    sigLastX = p.x; sigLastY = p.y;
    if (e.cancelable) e.preventDefault();
  }
  function sigMove(e) {
    if (!sigDrawing || !sigCtx) return;
    var p = sigPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(sigLastX, sigLastY);
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
    sigLastX = p.x; sigLastY = p.y;
    if (!sigHasInk) { sigHasInk = true; if (waiverCanvasWrap) waiverCanvasWrap.classList.add('has-ink'); }
    refreshSignState();
    if (e.cancelable) e.preventDefault();
  }
  function sigEnd() { sigDrawing = false; }
  function sigClear() {
    if (sigCtx && waiverCanvas) sigCtx.clearRect(0, 0, waiverCanvas.width, waiverCanvas.height);
    sigHasInk = false;
    if (waiverCanvasWrap) waiverCanvasWrap.classList.remove('has-ink');
    refreshSignState();
  }
  function hasDrawnSig() { return sigHasInk; }
  function hasTypedSig() { return waiverTypedSig && waiverTypedSig.value.trim().length > 1; }

  if (waiverCanvas) {
    waiverCanvas.addEventListener('mousedown', sigStart);
    window.addEventListener('mousemove', sigMove);
    window.addEventListener('mouseup', sigEnd);
    waiverCanvas.addEventListener('touchstart', sigStart, { passive: false });
    waiverCanvas.addEventListener('touchmove', sigMove, { passive: false });
    waiverCanvas.addEventListener('touchend', sigEnd);
  }
  if (waiverSigClear) waiverSigClear.addEventListener('click', sigClear);

  /* ---- enable/disable the Agree & Sign button ---- */
  function waiverReqFieldsOk() {
    var name = document.getElementById('wName');
    var ph = document.getElementById('wPhone');
    return !!(name && name.value.trim()) && !!(ph && ph.value.trim());
  }
  function refreshSignState() {
    if (!waiverSignBtn) return;
    var ok = waiverAgree && waiverAgree.checked && (hasDrawnSig() || hasTypedSig()) && waiverReqFieldsOk();
    waiverSignBtn.disabled = !ok;
  }
  if (waiverAgree) waiverAgree.addEventListener('change', refreshSignState);
  if (waiverTypedSig) waiverTypedSig.addEventListener('input', refreshSignState);
  $$('#waiverForm input').forEach(function (el) {
    el.addEventListener('input', function () { refreshSignState(); clearError(el.closest('.field')); });
  });

  /* ---- prefill name/phone from the reservation form ---- */
  function prefillWaiver() {
    var rName = document.getElementById('rName');
    var rPhone = document.getElementById('rPhone');
    var wName = document.getElementById('wName');
    var wPhone = document.getElementById('wPhone');
    if (wName && rName && rName.value.trim() && !wName.value.trim()) wName.value = rName.value.trim();
    if (wPhone && rPhone && rPhone.value.trim() && !wPhone.value.trim()) wPhone.value = rPhone.value.trim();
  }

  /* ---- focus trap ---- */
  function waiverFocusables() {
    return $$('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), canvas[tabindex], [tabindex]:not([tabindex="-1"])', waiverModal)
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }
  function onWaiverKeydown(e) {
    if (!waiverModal || waiverModal.hasAttribute('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeWaiver(); return; }
    if (e.key !== 'Tab') return;
    var f = waiverFocusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openWaiver() {
    if (!waiverModal) return;
    waiverLastFocused = document.activeElement;
    paintSignDate();
    prefillWaiver();
    waiverModal.removeAttribute('hidden');
    document.body.classList.add('is-locked');
    document.addEventListener('keydown', onWaiverKeydown);
    // canvas needs a layout pass before sizing
    requestAnimationFrame(function () { sigSetup(); refreshSignState(); });
    var close = document.getElementById('waiverClose');
    if (close) close.focus();
  }
  function closeWaiver() {
    if (!waiverModal) return;
    waiverModal.setAttribute('hidden', '');
    document.body.classList.remove('is-locked');
    document.removeEventListener('keydown', onWaiverKeydown);
    if (waiverLastFocused && waiverLastFocused.focus) waiverLastFocused.focus();
  }

  if (openWaiverBtn) openWaiverBtn.addEventListener('click', openWaiver);
  if (waiverCloseBtn) waiverCloseBtn.addEventListener('click', closeWaiver);
  if (waiverCancelBtn) waiverCancelBtn.addEventListener('click', closeWaiver);
  if (waiverOverlay) waiverOverlay.addEventListener('click', closeWaiver);

  /* ---- sign (submit of the waiver form) ---- */
  if (waiverForm) {
    waiverForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;

      var wName = document.getElementById('wName');
      var wPhone = document.getElementById('wPhone');
      if (!wName.value.trim()) { setError(wName.closest('.field')); if (!firstBad) firstBad = wName; } else clearError(wName.closest('.field'));
      if (!wPhone.value.trim()) { setError(wPhone.closest('.field')); if (!firstBad) firstBad = wPhone; } else clearError(wPhone.closest('.field'));

      var agreeErr = document.getElementById('wAgreeErr');
      if (!waiverAgree.checked) { if (agreeErr) agreeErr.classList.add('is-shown'); if (!firstBad) firstBad = waiverAgree; }
      else if (agreeErr) agreeErr.classList.remove('is-shown');

      var sigErr = document.getElementById('wSigErr');
      var sigOk = hasDrawnSig() || hasTypedSig();
      if (!sigOk) { if (sigErr) sigErr.classList.add('is-shown'); if (!firstBad) firstBad = (waiverTypedSig || waiverCanvas); }
      else if (sigErr) sigErr.classList.remove('is-shown');

      if (firstBad) { try { firstBad.focus(); } catch (err) {} return; }

      // capture the signature: drawn PNG data URL, or the typed legal name
      var drawn = hasDrawnSig();
      var signatureValue = drawn ? waiverCanvas.toDataURL('image/png') : waiverTypedSig.value.trim();
      var signerName = wName.value.trim();

      waiverData = {
        signerName: signerName,
        agreement: true,
        signatureType: drawn ? 'drawn' : 'typed',
        signature: signatureValue,
        typedName: drawn ? '' : waiverTypedSig.value.trim(),
        customer: {
          fullName: signerName,
          telephone: wPhone.value.trim(),
          address: (document.getElementById('wAddress').value || '').trim(),
          hotel: (document.getElementById('wHotel').value || '').trim(),
          roomNo: (document.getElementById('wRoom').value || '').trim(),
          checkin: document.getElementById('wCheckin').value || '',
          checkout: document.getElementById('wCheckout').value || ''
        },
        signedPlace: 'Puerto Penasco, Sonora',
        signedAtISO: new Date().toISOString()
      };

      markWaiverSigned(signerName);
      closeWaiver();
    });
  }

  function markWaiverSigned(name) {
    var pending = document.getElementById('waiverPending');
    var signed = document.getElementById('waiverSigned');
    var signedText = document.getElementById('waiverSignedText');
    var human = currentLang === 'es' ? signDate.es : signDate.en;
    if (signedText) {
      signedText.textContent = (currentLang === 'es' ? 'Firmado por ' : 'Signed by ') + name + (currentLang === 'es' ? ' el ' : ' on ') + human;
    }
    if (pending) pending.hidden = true;
    if (signed) signed.hidden = false;
    // change the open button label to "Review / re-sign"
    if (openWaiverBtn) {
      openWaiverBtn.setAttribute('data-en', 'Review or re-sign waiver');
      openWaiverBtn.setAttribute('data-es', 'Revisar o volver a firmar');
      openWaiverBtn.textContent = currentLang === 'es' ? 'Revisar o volver a firmar' : 'Review or re-sign waiver';
    }
    // clear the form-level waiver error if it was showing
    var waiverField = document.getElementById('waiverStep');
    clearError(waiverField ? waiverField.closest('.field') : null);
    // waiver signed -> unlock the reservation Submit
    unlockSubmit();
  }

  function resetWaiver() {
    waiverData = null;
    if (waiverForm) waiverForm.reset();
    sigClear();
    var pending = document.getElementById('waiverPending');
    var signed = document.getElementById('waiverSigned');
    if (pending) pending.hidden = false;
    if (signed) signed.hidden = true;
    if (waiverSignBtn) waiverSignBtn.disabled = true;
    if (openWaiverBtn) {
      openWaiverBtn.setAttribute('data-en', 'Read & sign the rental waiver');
      openWaiverBtn.setAttribute('data-es', 'Leer y firmar el contrato de renta');
      openWaiverBtn.textContent = currentLang === 'es' ? 'Leer y firmar el contrato de renta' : 'Read & sign the rental waiver';
    }
    var agreeErr = document.getElementById('wAgreeErr');
    var sigErr = document.getElementById('wSigErr');
    if (agreeErr) agreeErr.classList.remove('is-shown');
    if (sigErr) sigErr.classList.remove('is-shown');
    $$('#waiverForm .field').forEach(function (f) { f.classList.remove('has-error'); });
    // no waiver -> re-lock the reservation Submit and re-show the hint
    lockSubmit();
  }

  // keep the signing date + signed status label correct if the language toggles
  (function () {
    $$('.lang-toggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        paintSignDate();
        if (waiverData) markWaiverSigned(waiverData.signerName);
      });
    });
  })();

  /* =====================================================
     Gallery lightbox (focus-trapped, ESC, arrows, swipe)
     ===================================================== */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCount = document.getElementById('lbCount');
  var items = $$('.gallery__item');
  var galleryData = items.map(function (it) {
    var img = it.querySelector('img');
    return { full: it.getAttribute('data-full'), alt: img ? img.getAttribute('alt') : '' };
  });
  var lbIndex = 0;
  var lastFocused = null;

  function openLightbox(i) {
    if (!lb) return;
    lbIndex = (i + galleryData.length) % galleryData.length;
    lastFocused = document.activeElement;
    lbImg.src = galleryData[lbIndex].full;
    lbImg.alt = galleryData[lbIndex].alt;
    if (lbCount) lbCount.textContent = (lbIndex + 1) + ' / ' + galleryData.length;
    lb.classList.add('is-open');
    document.body.classList.add('is-locked');
    var closeBtn = document.getElementById('lbClose');
    if (closeBtn) closeBtn.focus();
  }
  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    lbImg.src = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function step(d) { openLightbox(lbIndex + d); }

  items.forEach(function (it, i) { it.addEventListener('click', function () { openLightbox(i); }); });
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbPrev) lbPrev.addEventListener('click', function () { step(-1); });
  if (lbNext) lbNext.addEventListener('click', function () { step(1); });
  if (lb) lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });

  document.addEventListener('keydown', function (e) {
    if (!lb || !lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Tab') {
      // simple focus trap among the lightbox controls
      var focusables = $$('button', lb);
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // swipe on touch
  if (lb) {
    var sx = 0;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* =====================================================
     Initial state: reservation Submit locked until waiver signed
     ===================================================== */
  if (!waiverData) lockSubmit();

  /* =====================================================
     Footer year
     ===================================================== */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

})();
