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
     i18n: EN primary, ES toggle (data-en / data-es)
     Auto-detect once, then respect localStorage + ?lang=
     ===================================================== */
  var I18N_KEY = 'lp_lang';
  function getInitialLang() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('lang') === 'es') return 'es';
    if (params.get('lang') === 'en') return 'en';
    var stored = localStorage.getItem(I18N_KEY);
    if (stored === 'es' || stored === 'en') return stored;
    var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    return nav.indexOf('es') === 0 ? 'es' : 'en';
  }

  function applyLang(lang) {
    var attr = lang === 'es' ? 'data-es' : 'data-en';
    // text content swaps
    $$('[data-en]').forEach(function (el) {
      var val = el.getAttribute(attr);
      if (val === null) return;
      // <title> and meta handled below; here swap visible text nodes only
      if (el.tagName === 'TITLE') { el.textContent = val; return; }
      el.textContent = val;
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
    localStorage.setItem(I18N_KEY, lang);
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
    var seen = sessionStorage.getItem('lp_seen') === '1';
    if (seen || reduceMotion) {
      // instant logo + fast fade for reduced motion / repeat visit
      loader.classList.add('is-ready');
      setTimeout(finishLoader, reduceMotion ? 120 : 350);
    } else {
      sessionStorage.setItem('lp_seen', '1');
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

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;

      function require(id) {
        var el = document.getElementById(id);
        var field = el ? el.closest('.field') : null;
        var ok = el && el.value && el.value.trim() !== '';
        if (!ok) { setError(field); if (!firstInvalid) firstInvalid = el; }
        else clearError(field);
        return ok;
      }

      require('rDate');
      require('rTime');
      require('rName');

      // End time: required, and must be AFTER the start time.
      var startEl = document.getElementById('rTime');
      var endEl = document.getElementById('rEndTime');
      var endField = endEl ? endEl.closest('.field') : null;
      var endErr = document.getElementById('rEndTimeErr');
      var endVal = endEl && endEl.value ? endEl.value.trim() : '';
      var startVal = startEl && startEl.value ? startEl.value.trim() : '';
      if (!endVal) {
        // missing end time
        if (endErr) {
          endErr.setAttribute('data-en', 'Pick an end time.');
          endErr.setAttribute('data-es', 'Escoge una hora de fin.');
          endErr.textContent = currentLang === 'es' ? 'Escoge una hora de fin.' : 'Pick an end time.';
        }
        setError(endField);
        if (!firstInvalid) firstInvalid = endEl;
      } else if (startVal && endVal <= startVal) {
        // end time is not after the start time (HH:MM strings compare lexically = chronologically)
        if (endErr) {
          endErr.setAttribute('data-en', 'End time must be after the start time.');
          endErr.setAttribute('data-es', 'La hora de fin debe ser posterior a la de inicio.');
          endErr.textContent = currentLang === 'es' ? 'La hora de fin debe ser posterior a la de inicio.' : 'End time must be after the start time.';
        }
        setError(endField);
        if (!firstInvalid) firstInvalid = endEl;
      } else {
        clearError(endField);
      }

      // riders >= 1
      var ridersOk = riders && clampRiders(riders.value) >= 1 && riders.value.trim() !== '';
      if (!ridersOk) { setError(riders.closest('.field')); if (!firstInvalid) firstInvalid = riders; }

      // vehicle radio
      var vehChecked = document.querySelector('.vehicle-pills input:checked');
      var vehField = document.querySelector('.vehicle-pills').closest('.field');
      if (!vehChecked) { setError(vehField); if (!firstInvalid) firstInvalid = document.querySelector('.vehicle-pills input'); }
      else clearError(vehField);

      // at least one of phone/email
      var phone = document.getElementById('rPhone');
      var email = document.getElementById('rEmail');
      var contactOk = (phone && phone.value.trim()) || (email && email.value.trim());
      if (!contactOk) {
        var contactField = document.getElementById('rContactErr').closest('.field');
        setError(contactField);
        setError(phone.closest('.field'));
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
        try { firstInvalid.focus({ preventScroll: true }); } catch (err) { firstInvalid.focus(); }
        return;
      }

      // ---- valid: submitting state ----
      var btn = document.getElementById('submitBtn');
      var label = btn.querySelector('.btn-label');
      var labelText = currentLang === 'es' ? 'Enviando...' : 'Sending...';
      btn.disabled = true;
      label.innerHTML = '<span class="spinner" aria-hidden="true"></span> ' + labelText;
      var errorNotice = document.getElementById('formError');
      if (errorNotice) errorNotice.classList.remove('is-shown');

      /*
        SUBMIT IS STUBBED. Send/STORE destination for the reservation + signed waiver is TBD (per owner).
        No network request is made and NO test submission is fired anywhere. We simulate the request
        then show the success state.

        The payload below now ALSO carries the signed digital waiver. When the destination is known,
        replace this timeout with a fetch(...) POSTing `payload`, and route the .catch() to showError().

        LEGAL-GRADE RECOMMENDATION when wiring this up: this is a binding rental contract, so the
        signed waiver should be delivered AND stored durably (e.g. server-side), and ideally a
        timestamped PDF/copy of exactly what the customer saw and signed should be generated and
        retained. The signature is captured as a PNG data URL (if drawn) or the typed legal name.
      */
      var payload = {
        reservation: {
          date: document.getElementById('rDate').value || '',
          time: document.getElementById('rTime').value || '', // kept for back-compat = start time
          startTime: document.getElementById('rTime').value || '',
          endTime: (document.getElementById('rEndTime') || {}).value || '',
          vehicle: (document.querySelector('.vehicle-pills input:checked') || {}).value || '',
          riders: riders ? clampRiders(riders.value) : null,
          name: (document.getElementById('rName').value || '').trim(),
          phone: (phone && phone.value.trim()) || '',
          email: (email && email.value.trim()) || '',
          notes: (document.getElementById('rNotes').value || '').trim()
        },
        waiver: waiverData // { signerName, agreement:true, signatureType, signature, customer:{...}, signedAtISO, signedPlace }
      };
      // payload is assembled for the future real endpoint; not posted anywhere in this stub.
      void payload;

      setTimeout(function () { showSuccess(); }, 900);
    });
  }

  function showSuccess() {
    var card = document.getElementById('reserveCard');
    var nameVal = (document.getElementById('rName').value || '').trim();
    var vehChecked = document.querySelector('.vehicle-pills input:checked');
    var vehName = vehChecked ? vehChecked.value : '';
    var dateVal = document.getElementById('rDate').value || '';
    var body = document.getElementById('successBody');
    if (body) {
      if (currentLang === 'es') {
        body.textContent = '¡Listo' + (nameVal ? ' ' + nameVal : '') + '! Tu ' + vehName + (dateVal ? ' del ' + dateVal : '') + ' quedó reservado. Revisa tu teléfono para los detalles de tu reserva. Nos vemos en la arena.';
      } else {
        body.textContent = 'You are booked' + (nameVal ? ', ' + nameVal : '') + '! Your ' + vehName + (dateVal ? ' for ' + dateVal : '') + ' is reserved. Check your phone for your booking details. See you on the sand.';
      }
    }
    if (card) card.classList.add('is-success');
    var success = document.getElementById('reserveSuccess');
    if (success) {
      var y = card.getBoundingClientRect().top + window.scrollY - navOffset() - 8;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      success.setAttribute('tabindex', '-1');
      success.focus({ preventScroll: true });
    }
  }

  /* exposed for future real-endpoint error handling */
  function showError() {
    var btn = document.getElementById('submitBtn');
    var label = btn.querySelector('.btn-label');
    btn.disabled = false;
    label.textContent = currentLang === 'es' ? 'Reservar mi paseo' : 'Book my ride';
    var errorNotice = document.getElementById('formError');
    if (errorNotice) errorNotice.classList.add('is-shown');
  }
  window.__lpShowError = showError; // available if a real endpoint is wired later

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
