/* Kontaktformular (contact.html / kontakt.html)
   Markup: <form data-contact-form> mit Feldern <label class="cform__field"> (data-rule, required), Radiogruppen
   „channel“ (email | phone) und „language“, Einwilligung (data-rule="consent"), Honeypot „website_url“.
   Regeln: name | text | email | phone | url | select | message | consent.
   Versand: per fetch an php/contact.php (Empfänger dort in MAIL_TO eintragen). Bei Fehlern erscheint [data-form-error]. */
(function () {
  "use strict";
  var form = document.querySelector("[data-contact-form]");
  if (!form) return;

  var RULES = {
    name:    function (v) { return /^[\p{L}][\p{L}\p{M}'’.\- ]{1,49}$/u.test(v); },
    text:    function (v, max) { return v.length <= max && v.length >= 2 && /^[\p{L}\p{N}][\p{L}\p{N}\p{M} &.,'’\-\/+()@]*$/u.test(v); },
    email:   function (v) { return v.length <= 254 && /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/.test(v); },
    phone:   function (v) { return /^\+?[\d\s()\/.\-]{6,25}$/.test(v) && (v.match(/\d/g) || []).length >= 6; },
    url:     function (v) { return v.length <= 200 && /^(https?:\/\/)?([\p{L}\p{N}-]+\.)+[\p{L}]{2,}(\/[^\s<>"']*)?$/u.test(v); },
    select:  function (v) { return v !== ""; },
    message: function (v) { return v.length >= 10 && v.length <= 2000; }
  };

  function valid(el) {
    if (el.type === "checkbox") return el.checked || !el.required;
    var v = el.value.trim();
    if (!v) return !el.required;
    var rule = RULES[el.getAttribute("data-rule")];
    return rule ? rule(v, parseInt(el.getAttribute("data-max"), 10) || 100) : true;
  }
  function mark(el) {
    var ok = valid(el), box = el.closest("label"), msg = box && box.querySelector(".cform__error");
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    if (box) box.classList.toggle("is-invalid", !ok);
    if (msg) msg.hidden = ok;
    return ok;
  }

  /* Telefon ist Pflicht, wenn die Rückmeldung per Telefon gewünscht ist */
  var phone = form.querySelector("[name=phone]");
  var hint = form.querySelector("[data-phone-hint]");
  var hintOptional = hint ? hint.getAttribute("data-optional") || hint.textContent : "";
  var hintRequired = hint ? hint.getAttribute("data-required") || "(required)" : "";
  function syncPhone() {
    var byPhone = form.querySelector("[name=channel]:checked").value === "phone";
    phone.required = byPhone;
    if (hint) hint.textContent = byPhone ? hintRequired : hintOptional;
    if (!byPhone && phone.getAttribute("aria-invalid") === "true") mark(phone);
  }
  Array.prototype.forEach.call(form.querySelectorAll("[name=channel]"), function (r) { r.addEventListener("change", syncPhone); });
  syncPhone();

  var status = form.querySelector("[data-form-status]");
  var thanks = document.querySelector("[data-form-thanks]");

  form.addEventListener("focusout", function (e) {
    var el = e.target;
    if (el.matches && el.matches("[data-rule]") && (el.type === "checkbox" ? el.getAttribute("aria-invalid") : (el.value || el.getAttribute("aria-invalid")))) mark(el);
  });
  form.addEventListener("input", function (e) {
    var el = e.target;
    if (el.matches && el.matches("[data-rule]") && el.getAttribute("aria-invalid") === "true") mark(el);
    if (status) status.hidden = true;
  });
  form.addEventListener("change", function (e) { if (e.target.matches && e.target.matches("[data-rule]")) mark(e.target); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = [];
    Array.prototype.forEach.call(form.querySelectorAll("[data-rule]"), function (el) { if (!mark(el)) bad.push(el); });
    if (bad.length) {
      if (status) status.hidden = false;
      bad[0].focus();
      return;
    }
    if (status) status.hidden = true;
    var hp = form.querySelector("[name=website_url]");
    if (hp && hp.value) return;   /* Honeypot ausgefüllt → vermutlich Bot, still ignorieren */

    /* Versand per fetch an php/contact.php (Endpunkt über data-endpoint am Formular) */
    var endpoint = form.getAttribute("data-endpoint") || "php/contact.php";
    var errorBox = form.querySelector("[data-form-error]");
    var submitBtn = form.querySelector("[type=submit]");
    if (errorBox) errorBox.hidden = true;
    submitBtn.disabled = true;
    submitBtn.classList.add("is-sending");
    fetch(endpoint, { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } })
      .then(function (res) { return res.json().catch(function () { return { ok: false }; }).then(function (j) { return { ok: res.ok && j && j.ok === true }; }); })
      .catch(function () { return { ok: false }; })
      .then(function (r) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-sending");
        if (!r.ok) { if (errorBox) errorBox.hidden = false; return; }
        form.reset();
        syncPhone();
        if (thanks) openThanks(); else form.hidden = true;
      });
  });

  /* Dankes-Overlay: schließen per Button, Kreuz, Klick daneben oder Esc; Fokus zurück zum Sendebutton */
  var lastFocus = null;
  function openThanks() {
    lastFocus = document.activeElement;
    thanks.hidden = false;
    document.documentElement.classList.add("has-thanks");
    var box = thanks.querySelector(".cform__thanks-box");
    if (box) box.focus();
  }
  function closeThanks() {
    thanks.hidden = true;
    document.documentElement.classList.remove("has-thanks");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (thanks) {
    thanks.addEventListener("click", function (e) {
      if (e.target === thanks || (e.target.closest && e.target.closest("[data-thanks-close]"))) closeThanks();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !thanks.hidden) closeThanks();
    });
  }
})();
