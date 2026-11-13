/* Site behaviour.
 *
 *  1. Header: hairline once the page scrolls; current section in the nav.
 *  2. Sections fade in as they enter the viewport.
 *  3. Image lightbox and blank table headers on the gallery pages.
 *
 * Everything degrades to plain content: without JavaScript, or with reduced
 * motion, nothing is hidden or animated.
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  /* 1. Header ---------------------------------------------------------- */

  function initHeader() {
    var header = document.querySelector(".site-header");
    var nav = document.querySelector(".site-nav");
    var links = $all(".site-nav a[href^='#']");
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var current = null;
    var ticking = false;

    function update() {
      ticking = false;
      if (header) header.classList.toggle("is-scrolled", window.scrollY > 4);
      if (!links.length) return;

      var line = (header ? header.offsetHeight : 0) + 80;
      var active = -1;
      targets.forEach(function (t, i) {
        if (t && t.getBoundingClientRect().top <= line) active = i;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        active = targets.length - 1;
      }
      if (active === current) return;
      current = active;
      links.forEach(function (a, i) { a.classList.toggle("is-active", i === active); });

      // On narrow screens the nav scrolls sideways. Scroll it only when the
      // active link is out of sight (never the page itself), so the Talks and
      // Memories pills at the start stay visible while they can.
      if (active >= 0 && nav && nav.scrollWidth > nav.clientWidth) {
        var nr = nav.getBoundingClientRect();
        var ar = links[active].getBoundingClientRect();
        var fade = 36;
        if (ar.left < nr.left || ar.right > nr.right - fade) {
          var delta = ar.left - nr.left - (nr.width - ar.width) / 2;
          nav.scrollBy({ left: delta, behavior: reduceMotion ? "auto" : "smooth" });
        }
      }
    }

    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* 2. Reveal ---------------------------------------------------------- */

  function initReveal() {
    var items = [];
    $all(".intro > *, .page > .facts, .page > .section").forEach(function (el, i) {
      el.classList.add("reveal");
      if (el.parentElement && el.parentElement.classList.contains("intro")) {
        el.style.transitionDelay = (i * 0.08) + "s";
      }
      items.push(el);
    });
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });
    items.forEach(function (el) { io.observe(el); });

    // A link to a section further down should never land on an invisible one.
    window.addEventListener("hashchange", function () {
      var t = document.getElementById(location.hash.slice(1));
      var s = t && t.closest(".reveal");
      if (s) s.classList.add("is-in");
    });
  }

  /* 3. Gallery helpers -------------------------------------------------- */

  function initLightbox() {
    $all("figure.plate img, body:not(.home) .page td img").forEach(function (img) {
      img.addEventListener("click", function () {
        var box = document.createElement("div");
        box.className = "lightbox";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-label", img.alt || "Image");
        var big = document.createElement("img");
        big.src = img.currentSrc || img.src;
        big.alt = img.alt || "";
        box.appendChild(big);
        function close() { box.remove(); document.removeEventListener("keydown", onKey); }
        function onKey(e) { if (e.key === "Escape") close(); }
        box.addEventListener("click", close);
        document.addEventListener("keydown", onKey);
        document.body.appendChild(box);
      });
    });
  }

  function hideBlankTableHeads() {
    $all("table thead").forEach(function (thead) {
      var blank = $all("th", thead).every(function (th) { return !th.textContent.trim(); });
      if (blank) thead.classList.add("is-blank");
    });
  }

  function boot() {
    initHeader();
    initReveal();
    initLightbox();
    hideBlankTableHeads();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
