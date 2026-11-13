/* Vorteile (Variante 4): Kacheln mit Plus-/Kreuz-Overlay */
(function () {
  "use strict";
  var tiles = Array.prototype.slice.call(document.querySelectorAll("[data-tile]"));
  function setOpen(tile, open) {
    var btn = tile.querySelector(".v4-tile__toggle");
    tile.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", btn.getAttribute(open ? "data-label-open" : "data-label-closed"));
  }
  tiles.forEach(function (tile) {
    tile.querySelector(".v4-tile__toggle").addEventListener("click", function () {
      setOpen(tile, !tile.classList.contains("is-open"));
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") tiles.forEach(function (t) { setOpen(t, false); });
  });
})();
