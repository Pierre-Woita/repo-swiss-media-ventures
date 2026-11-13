/* Minimales Vanilla-JS (kein Framework, kein Build):
   1) Burger-Menü   2) Leistungs-Slider (Pfeile + Zähler), 2a) Slider-Punkte, 2b) Prozess-Slider */
(function () {
  "use strict";

  /* ---- 1. Burger-Menü ------------------------------------------------ */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  if (header && toggle) {
    var setOpen = function (open) {
      header.setAttribute("data-open", String(open));
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", toggle.getAttribute(open ? "data-label-open" : "data-label-closed") || (open ? "Menü schließen" : "Menü öffnen"));
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    /* Klick auf den abgedunkelten Bereich schließt das Menü */
    document.addEventListener("click", function (e) {
      var menu = document.getElementById("site-nav");
      if (header.getAttribute("data-open") === "true" && menu && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function () { setOpen(false); });
  }

  /* ---- 2. Slider ------------------------------------------------------ */
  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var viewport = root.querySelector("[data-carousel-viewport]");
    var cards = viewport.querySelectorAll(".card, .step");
    var prev = root.querySelector("[data-carousel-prev]");
    var next = root.querySelector("[data-carousel-next]");
    var cur = root.querySelector("[data-carousel-current]");
    var total = root.querySelector("[data-carousel-total]");
    var pad = function (n) { return String(n).padStart(2, "0"); };
    if (total) total.textContent = pad(cards.length);

    function step() {
      return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : viewport.clientWidth;
    }
    function update() {
      var i = Math.round(viewport.scrollLeft / step());
      if (cur) cur.textContent = pad(Math.min(i + 1, cards.length));
      /* Startposition = linkes Innenpadding des Viewports (z. B. Ankernavigation), sonst wäre der linke Pfeil anfangs fälschlich aktiv */
      prev.disabled = viewport.scrollLeft <= (parseFloat(getComputedStyle(viewport).paddingLeft) || 0) + 1;
      next.disabled = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 1;
    }
    prev.addEventListener("click", function () { viewport.scrollBy({ left: -step(), behavior: "smooth" }); });
    next.addEventListener("click", function () { viewport.scrollBy({ left: step(), behavior: "smooth" }); });
    viewport.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", update);
    viewport.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); }
    });
    update();
  });

  /* ---- 2a. Slider-Punkte (Startseite „Our services“, nur mobil sichtbar) ----
     Positionsanzeige; die Punkte sind anklickbar. Markup: <div class="carousel__dots" data-carousel-dots aria-hidden="true"></div>
     innerhalb von [data-carousel]; pro Kachel wird ein Punkt erzeugt, der aktive bekommt .is-active. */
  document.querySelectorAll("[data-carousel-dots]").forEach(function (dots) {
    var root = dots.closest("[data-carousel]");
    var vp = root && root.querySelector("[data-carousel-viewport]");
    if (!vp) return;
    var cards = vp.querySelectorAll(".card, .step");
    /* Punkte sind anklickbar (< 768 px sichtbar): Klick scrollt den Slider zur jeweiligen Kachel */
    dots.removeAttribute("aria-hidden");
    Array.prototype.forEach.call(cards, function (card) {
      var b = document.createElement("button");
      var t = card.querySelector(".card__title, .step__title");
      b.type = "button";
      b.setAttribute("aria-label", (t ? t.textContent : card.textContent).replace(/\s+/g, " ").trim());
      b.addEventListener("click", function () {
        vp.scrollTo({ left: vp.scrollLeft + card.getBoundingClientRect().left - vp.getBoundingClientRect().left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
      dots.appendChild(b);
    });
    var items = dots.children;
    function update() {
      var step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : vp.clientWidth;
      var idx = Math.round(vp.scrollLeft / step);
      if (vp.scrollLeft + vp.clientWidth >= vp.scrollWidth - 2) idx = cards.length - 1;   /* Ende erreicht: letzter Punkt */
      for (var k = 0; k < items.length; k++) items[k].classList.toggle("is-active", k === idx);
    }
    vp.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  /* ---- 2b. Prozess-Slider: Pfeile + Zähler, Beschreibung per „+“ ---- */
  document.querySelectorAll("[data-slider]").forEach(function (root) {
    var vp = root.querySelector("[data-slider-viewport]");
    var slides = Array.prototype.slice.call(vp.querySelectorAll("[data-slide]"));
    var prev = root.querySelector("[data-slider-prev]");
    var next = root.querySelector("[data-slider-next]");
    var cur = root.querySelector("[data-slider-current]");
    var total = root.querySelector("[data-slider-total]");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var index = 0;
    if (total) total.textContent = pad(slides.length);

    function offset(i) { return slides[i].offsetLeft - slides[0].offsetLeft; }
    function setOpen(slide, open) {
      var btn = slide.querySelector(".slide__toggle");
      slide.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", btn.getAttribute(open ? "data-label-open" : "data-label-closed"));
    }
    function closeAll() { slides.forEach(function (s) { setOpen(s, false); }); }
    function render(i) {
      index = i;
      if (cur) cur.textContent = pad(i + 1);
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
    }
    function goTo(i, instant) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      closeAll();
      vp.scrollTo({ left: offset(i), behavior: instant || reduce ? "auto" : "smooth" });
      render(i);
    }
    var tick;
    vp.addEventListener("scroll", function () {
      window.cancelAnimationFrame(tick);
      tick = window.requestAnimationFrame(function () {
        var best = 0, bestD = Infinity;
        slides.forEach(function (s, k) { var d = Math.abs(offset(k) - vp.scrollLeft); if (d < bestD) { bestD = d; best = k; } });
        if (best !== index) { closeAll(); render(best); }
      });
    }, { passive: true });
    slides.forEach(function (s) {
      s.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest(".slide__panel-link")) return;   /* Textlink im Overlay: nur navigieren, nicht umschalten */
        setOpen(s, !s.classList.contains("is-open"));
      });
    });
    prev.addEventListener("click", function () { goTo(index - 1); });
    next.addEventListener("click", function () { goTo(index + 1); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
    window.addEventListener("resize", function () { goTo(index, true); });
    render(0);
  });

  /* ---- 2c. Einblenden beim Scrollen (.reveal): nur Elemente unterhalb des Bildschirms ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.remove("reveal--hidden"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("reveal--hidden"); io.observe(el); }
    });
  }

  /* ---- 2d. Ankernavigation (Leistungen): Scrollspy – aktive Kachel hervorheben und im Slider zeigen ---- */
  document.querySelectorAll(".anchor-nav").forEach(function (nav) {
    var vp = nav.querySelector("[data-carousel-viewport]");
    var links = Array.prototype.slice.call(nav.querySelectorAll(".card__link"));
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var active = -1, ticking = false;

    function setActive(i) {
      if (i === active) return;
      active = i;
      links.forEach(function (a, k) {
        var on = k === i;
        a.parentNode.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      if (i < 0) return;
      /* Kachel im Slider sichtbar machen (nur horizontal, die Seite scrollt nicht mit) */
      var card = links[i].parentNode.getBoundingClientRect(), box = vp.getBoundingClientRect();
      if (card.left < box.left || card.right > box.right) {
        vp.scrollTo({ left: vp.scrollLeft + card.left - box.left - 8, behavior: reduce ? "auto" : "smooth" });
      }
    }
    function update() {
      ticking = false;
      /* Aktivierungslinie: Unterkante der Navigation, WENN sie oben klebt (sticky top + Höhe), nicht ihre aktuelle Lage.
         So bleibt beim Laden (Navigation noch weit unten im Seitenfluss) jede Kachel auf Standard. */
      var stuckBottom = (parseFloat(window.getComputedStyle(nav).top) || 0) + nav.offsetHeight;
      var probe = Math.min(nav.getBoundingClientRect().bottom, stuckBottom) + 60, cur = -1;   /* +60: Toleranz für den Abstand nach Sprung per Anker */
      targets.forEach(function (t, k) {
        if (!t) return;
        var r = t.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) cur = k;
      });
      setActive(cur);
    }
    function request() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    update();
  });
  /* ---- 2e. Sprung von der Startseite (Prozess-Slider „More information“, Leistungs-Kacheln):
          Link-Format  how-we-work.html?step=analyze  bzw.  services.html?step=strategy  (ID der Ziel-Section).
          Die Seite lädt zuerst oben und vollständig; danach scrollt sie automatisch sanft zur Ziel-Section. ---- */
  (function () {
    var m = /[?&]step=([a-z-]+)/.exec(location.search);
    var target = m && document.getElementById(m[1]);
    if (!target || !(target.classList.contains("pstep") || target.classList.contains("svc"))) return;   /* Prozess-Schritte (Arbeitsweise) und Leistungsbereiche (Leistungen) */
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function go() {
      target.classList.remove("reveal--hidden");   /* Einblend-Versatz entfernen, damit die Zielposition exakt stimmt */
      if (history.replaceState) history.replaceState(null, "", location.pathname + "#" + m[1]);   /* saubere URL mit Anker (vor dem Scrollen, damit nichts den Scroll unterbricht) */
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });   /* berücksichtigt scroll-margin-top (Header) */
    }
    function start() {
      var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      ready.then(function () { window.setTimeout(go, reduce ? 0 : 400); });   /* kurze Pause: erst die geladene Seite sehen, dann scrollen */
    }
    if (document.readyState === "complete") start(); else window.addEventListener("load", start);
  })();

  /* ---- Dialog-Overlay (Kontakt, Compliance): wird ausschließlich über diese beiden Funktionen geöffnet und geschlossen ----
          openDialog(dlg) / closeDialog(dlg) akzeptieren das <dialog>-Element oder dessen ID und sind global verfügbar
          (window.openDialog / window.closeDialog). Auslöser im HTML: data-dialog-open="<dialog-id>" am Button,
          data-dialog-close am Schließen-Kreuz; zusätzlich schließen Klick auf den Hintergrund und die Esc-Taste. ---- */
  function resolveDialog(d) { return typeof d === "string" ? document.getElementById(d) : d; }
  function openDialog(d) {
    var dlg = resolveDialog(d);
    if (!dlg || dlg.open) return;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");   /* Fallback für ältere Browser */
    var x = dlg.querySelector("[data-dialog-close]");
    if (x && !dlg.querySelector("[data-dialog-step]")) x.focus({ preventScroll: true });   /* Dialoge ohne Schrittfolge: Fokus aufs Schließen-Kreuz */
  }
  function closeDialog(d) {
    var dlg = resolveDialog(d);
    if (!dlg || !dlg.open) return;
    if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
  }
  window.openDialog = openDialog;
  window.closeDialog = closeDialog;

  Array.prototype.forEach.call(document.querySelectorAll("[data-dialog-open]"), function (btn) {
    var dlg = document.getElementById(btn.getAttribute("data-dialog-open"));
    if (!dlg) return;
    btn.addEventListener("click", function () { if (typeof showStep === "function") showStep(0); openDialog(dlg); });
    Array.prototype.forEach.call(dlg.querySelectorAll("[data-dialog-close]"), function (c) {
      c.addEventListener("click", function () { closeDialog(dlg); });
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDialog(dlg); });   /* Klick auf Backdrop */
    dlg.addEventListener("close", function () { btn.focus({ preventScroll: true }); });   /* Fokus zurück zum Auslöser (auch bei Esc) */

    /* Formularprozess: Einstieg (<template id="step-intro">) + Schritte <template id="step-1"> … "step-N".
       Der Fortschrittsbalken zeigt Schritt / Gesamtzahl (Einstieg = 0 %). */
    var stepBox = dlg.querySelector("[data-dialog-step]");
    var bar = dlg.querySelector(".dialog__progress");
    var back = dlg.querySelector("[data-dialog-back]");       /* Zurück-Button im Seitenkopf (nur bei den Fragen ab Schritt 2) */
    var body = dlg.querySelector(".dialog__body");
    if (!stepBox || !bar) return;
    var total = 0;                      /* Anzahl aller Schritte (step-1 … step-N) */
    while (dlg.querySelector("#step-" + (total + 1))) total++;
    var questions = 0;                  /* davon Fragen (Schritte mit Antwort-Buttons); der Rest ist die Zusammenfassung */
    for (var s = 1; s <= total; s++) { if (dlg.querySelector("#step-" + s).content.querySelector("[data-answer]")) questions++; }
    var current = 0, leaving = false, timer = 0;
    var answers = {};                   /* Schritt → { q: Frage, a: gewählte Antwort } */
    var editing = false;                /* Frage wurde aus der Zusammenfassung heraus erneut geöffnet → danach zurück zur Zusammenfassung */
    var uiLang = (document.documentElement.lang || "de").slice(0, 2);
    var editLabel = uiLang === "de" ? "Antwort ändern" : (uiLang === "es" ? "Cambiar respuesta" : (uiLang === "pt" ? "Alterar resposta" : (uiLang === "nl" ? "Antwoord wijzigen" : (uiLang === "it" ? "Modifica risposta" : (uiLang === "ru" ? "Изменить ответ" : "Edit answer")))));
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    var LEAVE_MS = 700;   /* Dauer der Exit-Animation inkl. Versatz der Buttons (siehe CSS .is-leaving) */

    function showStep(n, fromBack) {
      var tpl = dlg.querySelector(n === 0 ? "#step-intro" : "#step-" + n);
      if (!tpl) return;
      window.clearTimeout(timer);
      current = n; leaving = false;
      stepBox.classList.remove("is-leaving", "is-leaving-back");
      stepBox.classList.toggle("is-back", !!fromBack);        /* Rückwärts: Inhalt fährt von links ein */
      if (back) {
        var showBack = n >= 2 && n <= questions && !editing;  /* Schritt 2 bis 10 (nicht beim Ändern aus der Zusammenfassung) */
        back.hidden = !showBack; back.disabled = false; back.classList.remove("is-selected");
        if (body) body.classList.toggle("has-back", showBack);
      }
      stepBox.innerHTML = "";
      stepBox.appendChild(tpl.content.cloneNode(true));
      var list = stepBox.querySelector("[data-summary]");
      if (list) renderSummary(list);
      var pct = questions ? Math.round(Math.min(n, questions) / questions * 100) : 0;   /* Zusammenfassung = 100 % */
      bar.hidden = tpl.hasAttribute("data-no-progress");   /* „Ihre Daten“ und „Vielen Dank“ ohne Fortschrittsanzeige */
      bar.style.setProperty("--progress", pct + "%");
      bar.setAttribute("aria-valuenow", pct);
      dlg.scrollTop = 0;
      var h = stepBox.querySelector("h2, h1");
      if (h && dlg.open) h.focus({ preventScroll: true });
    }
    /* Zusammenfassung: alle gewählten Antworten in der Reihenfolge der Fragen */
    function renderSummary(list) {
      Object.keys(answers).sort(function (a, b) { return a - b; }).forEach(function (k) {
        var li = document.createElement("li"), txt = document.createElement("div"), q = document.createElement("span"), a = document.createElement("span");
        var ed = document.createElement("button");
        q.className = "dialog__sum-q"; q.textContent = answers[k].q;
        a.className = "dialog__sum-a"; a.textContent = answers[k].a;
        txt.className = "dialog__sum-text"; txt.appendChild(q); txt.appendChild(a);
        ed.type = "button"; ed.className = "dialog__btn dialog__edit"; ed.setAttribute("data-edit", k);   /* Editier-Button: springt zur Frage */
        ed.setAttribute("aria-label", editLabel + ": " + answers[k].q);
        ed.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg>';
        li.appendChild(txt); li.appendChild(ed); list.appendChild(li);
      });
    }
    /* Auswahl getroffen: Inhalt gleitet nach links hinaus, danach läuft cb.
       Keine Mehrfachauswahl: nach dem ersten Klick sind alle Buttons gesperrt. */
    function leave(btn, cb, toRight) {
      if (leaving) return;
      leaving = true;
      if (toRight) stepBox.classList.add("is-leaving-back");   /* Zurück: Inhalt gleitet nach rechts hinaus */
      Array.prototype.forEach.call(stepBox.querySelectorAll("button"), function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        b.disabled = true;
      });
      btn.classList.add("is-selected");
      stepBox.classList.add("is-leaving");
      timer = window.setTimeout(cb, reduce && reduce.matches ? 0 : LEAVE_MS);
    }
    function answer(btn) {
      var q = stepBox.querySelector(".dialog__question");
      answers[current] = { q: q ? q.textContent : "", a: btn.textContent.trim() };
      leave(btn, function () {
        if (editing) { editing = false; showStep(questions + 1); }   /* geänderte Antwort → zurück zur Zusammenfassung */
        else if (dlg.querySelector("#step-" + (current + 1))) showStep(current + 1); else closeDialog(dlg);
      });
    }
    if (back) back.addEventListener("click", function () {   /* immer zur vorigen Ansicht bzw. zum vorigen Schritt */
      if (leaving || current < 2) return;
      leave(back, function () { showStep(current - 1, true); }, true);
    });
    stepBox.addEventListener("click", function (e) {
      var t = e.target.closest("button");
      if (!t) return;
      if (t.hasAttribute("data-answer")) answer(t);
      else if (t.hasAttribute("data-edit")) { var k = parseInt(t.getAttribute("data-edit"), 10); leave(t, function () { editing = true; showStep(k); }); }   /* Zusammenfassung: Frage erneut beantworten */
      else if (t.hasAttribute("data-step-start")) showStep(1);                                        /* Einstieg → Schritt 1 */
      else if (t.hasAttribute("data-step-restart")) leave(t, function () { answers = {}; editing = false; showStep(1); });   /* „nochmal“ */
      else if (t.hasAttribute("data-step-confirm")) leave(t, function () { showStep(current + 1); });   /* „korrekt“ → Ihre Daten */
      else if (t.hasAttribute("data-step-cancel") || t.hasAttribute("data-step-close")) leave(t, function () { closeDialog(dlg); });   /* „Abbrechen“ / „Schließen“ */
    });
    /* ---- „Ihre Daten“: Validierung und Tooltip am Senden-Button ----
       Regeln pro Feld über data-rule (name | text | email | phone | url | consent), Pflichtfelder über required.
       TODO: Versand der Antworten und Eingaben (E-Mail o. Ä.) ist bewusst entfernt und wird später ergänzt – aktuell werden keine Daten übertragen. */
    var RULES = {
      name:    function (v) { return /^[\p{L}][\p{L}\p{M}'’.\- ]{1,49}$/u.test(v); },
      text:    function (v, max) { return v.length <= max && /^[\p{L}\p{N}][\p{L}\p{N}\p{M} &.,'’\-\/+()@]*$/u.test(v) && v.length >= 2; },
      email:   function (v) { return v.length <= 254 && /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/.test(v); },
      phone:   function (v) { return /^\+?[\d\s()\/.\-]{6,25}$/.test(v) && (v.match(/\d/g) || []).length >= 6; },
      url:     function (v) { return v.length <= 200 && /^(https?:\/\/)?([\p{L}\p{N}-]+\.)+[\p{L}]{2,}(\/[^\s<>"']*)?$/u.test(v); }
    };
    function fieldValid(el) {
      if (el.type === "checkbox") return el.checked || !el.required;
      var v = el.value.trim();
      if (!v) return !el.required;
      var rule = RULES[el.getAttribute("data-rule")];
      return rule ? rule(v, parseInt(el.getAttribute("data-max"), 10) || 100) : true;
    }
    function markField(el, force) {
      var ok = fieldValid(el), box = el.closest("label"), msg = box && box.querySelector(".dialog__error");
      el.setAttribute("aria-invalid", ok ? "false" : "true");
      if (box) box.classList.toggle("is-invalid", !ok);
      if (msg) msg.hidden = ok;
      return ok;
    }
    var tipTimer = 0;
    function showTip(form, text) {
      var tip = form.querySelector(".dialog__tooltip");
      if (!tip) return;
      if (text) tip.textContent = text;
      tip.hidden = false;
      window.clearTimeout(tipTimer);
      tipTimer = window.setTimeout(function () { tip.hidden = true; }, 6000);
    }
    function hideTip(form) { var t = form && form.querySelector(".dialog__tooltip"); if (t) t.hidden = true; }
    stepBox.addEventListener("focusout", function (e) {
      var el = e.target;
      if (el.matches && el.matches("[data-rule]") && (el.type === "checkbox" ? el.getAttribute("aria-invalid") : (el.value || el.getAttribute("aria-invalid")))) markField(el);
    });
    stepBox.addEventListener("input", function (e) {
      var el = e.target;
      if (el.matches && el.matches("[data-rule]") && el.getAttribute("aria-invalid") === "true") markField(el);
      hideTip(el.closest && el.closest("form"));
    });
    stepBox.addEventListener("change", function (e) { if (e.target.matches && e.target.matches("[data-rule]")) markField(e.target); });

    stepBox.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target.closest("form");
      if (!f || leaving) return;
      var bad = [];
      Array.prototype.forEach.call(f.querySelectorAll("[data-rule]"), function (el) { if (!markField(el)) bad.push(el); });
      var btn = f.querySelector("[type=submit]");
      if (bad.length) {                                   /* Pflichtfelder fehlen oder fehlerhaft → Tooltip am Button */
        showTip(f, f.getAttribute("data-tip"));
        bad[0].focus();
        return;
      }
      hideTip(f);
      leave(btn, function () { showStep(current + 1); });   /* alles korrekt → „Vielen Dank“ (vorerst ohne Datenversand) */
    });
    dlg.addEventListener("close", function () { answers = {}; editing = false; showStep(0); });   /* beim Schließen zurück zum Einstieg */
    showStep(0);
  });
  /* ---- Reveal-Button (z. B. Datenschutz, E-Mail-Adresse anzeigen) ----
          HTML: <a class="btn btn--secondary btn--reveal" data-reveal-value="…" (oder data-reveal-user="…" data-reveal-host="…" für E-Mail) data-hide-label="…">
                  <span class="btn__swap"><span class="btn__label">Standardtext</span><svg class="icon btn__icon">…</svg></span></a>
          Der Inhalt (user@host) steht RÜCKWÄRTS in den data-Attributen und wird erst beim Klick zusammengesetzt.
          Klick 1: Text wechselt animiert zum Inhalt (Schließen-Kreuz erscheint); Klick 2: zurück zum Standardzustand. ---- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-reveal-value], [data-reveal-user][data-reveal-host]"), function (btn) {
    var swap = btn.querySelector(".btn__swap"), label = btn.querySelector(".btn__label");
    if (!swap || !label) return;
    var rev = function (s) { return (s || "").split("").reverse().join(""); };
    var defaultText = label.textContent, shown = false, busy = false;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-expanded", "false");

    function render(show) {
      var single = btn.getAttribute("data-reveal-value");   /* Einzelwert (z. B. Telefonnummer) oder user + host (E-Mail) */
      var value = single !== null ? rev(single) : rev(btn.getAttribute("data-reveal-user")) + "@" + rev(btn.getAttribute("data-reveal-host"));
      label.textContent = show ? value : defaultText;
      btn.classList.toggle("is-revealed", show);
      btn.setAttribute("aria-expanded", String(show));
      if (show) btn.setAttribute("aria-label", value + " – " + (btn.getAttribute("data-hide-label") || "")); else btn.removeAttribute("aria-label");
    }
    function toggle() {
      if (busy) return;
      shown = !shown;
      if (reduce && reduce.matches) { render(shown); return; }
      busy = true;
      var from = btn.getBoundingClientRect().width;
      btn.style.width = from + "px";                    /* aktuelle Breite festhalten … */
      swap.classList.add("is-swapping");                /* … Text ausblenden … */
      window.setTimeout(function () {
        render(shown);                                  /* … Inhalt tauschen … */
        btn.style.width = "auto";
        var to = btn.getBoundingClientRect().width;     /* … neue Zielbreite messen … */
        btn.style.width = from + "px";
        void btn.offsetWidth;
        btn.style.width = to + "px";                    /* … Breite animieren und Text einblenden */
        swap.classList.remove("is-swapping");
        window.setTimeout(function () { btn.style.width = ""; busy = false; }, 420);
      }, 160);
    }
    btn.addEventListener("click", function (e) { e.preventDefault(); toggle(); });
    btn.addEventListener("keydown", function (e) { if (e.key === " ") { e.preventDefault(); toggle(); } });   /* Leertaste wie bei einem Button */
  });
  /* ---- 3. Raster-Overlay (Entwicklungshilfe): Taste „G“ oder ?grid ------- */
  function toggleGrid(force) {
    var el = document.querySelector(".grid-overlay");
    if (el) { if (force !== true) el.remove(); return; }
    el = document.createElement("div");
    el.className = "grid-overlay"; el.setAttribute("aria-hidden", "true");
    var cols = ""; for (var i = 1; i <= 12; i++) cols += '<div class="col-1"><i></i></div>';
    el.innerHTML = '<div class="container"><div class="row">' + cols + "</div></div>";
    document.body.appendChild(el);
  }
  document.addEventListener("keydown", function (e) {
    var t = e.target && e.target.tagName;
    if ((e.key === "g" || e.key === "G") && !e.ctrlKey && !e.metaKey && t !== "INPUT" && t !== "TEXTAREA") toggleGrid();
  });
  if (/[?&]grid\b/.test(location.search)) toggleGrid(true);
})();

/* Startseite: Kacheln „Was wir bieten“ gleich hoch wie die Kacheln „Was wir können“ */
(function () {
  "use strict";
  var benefits = document.querySelector(".section--benefits-tiles");
  var process = document.querySelector(".process-carousel");
  var services = document.querySelector(".section--services-tiles:not(.section--benefits-tiles) .card--service");
  if (!benefits || !services) return;
  var sync = function () {
    benefits.style.removeProperty("--tile-h");
    var h = services.getBoundingClientRect().height;
    if (h > 0) benefits.style.setProperty("--tile-h", h + "px");
    if (process) { process.style.removeProperty("--tile-h"); if (h > 0) process.style.setProperty("--tile-h", h + "px"); }
  };
  sync();
  window.addEventListener("load", sync);
  window.addEventListener("resize", sync);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
})();

/* Leistungen: Ankernavigation wird beim Ankleben am oberen Rand zum einzeiligen Slider
   (.is-stuck; Pfeil-Buttons ab 768 px, Slider-Punkte darunter). Die Leiste behält ihren Platz im Seitenfluss (margin-bottom-Ausgleich),
   damit der Inhalt beim Wechsel nicht springt. */
(function () {
  "use strict";
  var nav = document.querySelector("[data-anchor-slider]");
  if (!nav) return;
  var sentinel = nav.previousElementSibling;
  var vp = nav.querySelector("[data-carousel-viewport]");
  var items = Array.prototype.slice.call(nav.querySelectorAll(".carousel__track > li"));
  var prev = nav.querySelector(".anchor-nav__arrow--prev"), next = nav.querySelector(".anchor-nav__arrow--next");
  var dots = nav.querySelector(".anchor-nav__dots");
  var permanent = nav.getAttribute("data-anchor-slider") === "permanent";   /* Leistungen: Slider-Darstellung dauerhaft, kein Wechsel beim Ankleben */
  var stuck = false, h0 = 0, hs = 0;
  /* Slider-Punkte (< 768 px): anklickbar – Klick scrollt den Slider zur jeweiligen Kachel */
  dots.removeAttribute("aria-hidden");
  items.forEach(function (li, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", li.textContent.replace(/\s+/g, " ").trim());
    b.addEventListener("click", function () { vp.scrollTo({ left: vp.scrollLeft + li.getBoundingClientRect().left - vp.getBoundingClientRect().left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); });
    dots.appendChild(b);
  });
  if (permanent) { stuck = true; nav.classList.add("is-stuck"); }

  function measure() {
    var was = stuck;
    if (permanent) { nav.style.marginBottom = ""; return; }
    nav.style.marginBottom = "";
    nav.classList.remove("is-stuck"); h0 = nav.offsetHeight;
    nav.classList.add("is-stuck"); hs = nav.offsetHeight;
    nav.classList.toggle("is-stuck", was);
    nav.style.marginBottom = was ? Math.max(0, h0 - hs) + "px" : "";
  }
  function setStuck(on) {
    if (on === stuck) return;
    stuck = on;
    nav.classList.toggle("is-stuck", on);
    nav.style.marginBottom = on ? Math.max(0, h0 - hs) + "px" : "";
    vp.scrollLeft = 0;
    sliderUpdate();
  }
  function check() {
    var natural = sentinel.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(nav).marginTop) || 0);
    nav.classList.toggle("is-pinned", natural <= 0.5);   /* Schatten nur, wenn die Leiste oben klebt */
    setStuck(permanent ? true : natural <= 0.5);
  }
  /* Slider nur aktiv, wenn Kacheln über den Viewport hinausragen (oder angeschnitten sind): Klasse .is-scrollable (steuert Slider-Punkte) */
  function updateScrollable() { nav.classList.toggle("is-scrollable", vp.scrollWidth > vp.clientWidth + 1); }
  function stepW() { return items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : vp.clientWidth; }
  function sliderUpdate() {
    if (!stuck) return;
    var max = vp.scrollWidth - vp.clientWidth;
    prev.disabled = vp.scrollLeft <= 1; next.disabled = vp.scrollLeft >= max - 1;
    var idx = 0;
    for (var i = 0; i < items.length; i++) { if (items[i].getBoundingClientRect().left - vp.getBoundingClientRect().left <= 4) idx = i; }
    if (vp.scrollLeft >= max - 2) idx = items.length - 1;
    for (var k = 0; k < dots.children.length; k++) dots.children[k].classList.toggle("is-active", k === idx);
  }
  prev.addEventListener("click", function () { vp.scrollBy({ left: -vp.clientWidth * 0.8, behavior: "smooth" }); });
  next.addEventListener("click", function () { vp.scrollBy({ left: vp.clientWidth * 0.8, behavior: "smooth" }); });
  vp.addEventListener("scroll", function () { window.requestAnimationFrame(sliderUpdate); }, { passive: true });
  window.addEventListener("scroll", function () { window.requestAnimationFrame(check); }, { passive: true });
  window.addEventListener("resize", function () { measure(); check(); sliderUpdate(); updateScrollable(); });
  window.addEventListener("load", function () { measure(); check(); updateScrollable(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); check(); updateScrollable(); });
  measure(); check(); updateScrollable();
})();
