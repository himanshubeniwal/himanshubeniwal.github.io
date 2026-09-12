/* -------------------------------------------------------------------
 * Site behaviour: theme toggle, scroll-spy nav, reading progress,
 * heading anchors, image lightbox, collapsible news feed.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- 1. Colour theme ------------------------------------- */
  function applyTheme(mode) {
    root.setAttribute("data-theme", mode);
    var btn = document.querySelector(".theme-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        mode === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
  }

  function initTheme() {
    var btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    applyTheme(root.getAttribute("data-theme") || "light");
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* storage unavailable — theme still applies for this page */
      }
    });
  }

  /* ---------- 2. Sidebar scroll-spy ------------------------------- */
  function initScrollSpy() {
    var links = [].slice.call(document.querySelectorAll(".site-nav a[href*='#']"));
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    var targets = [];

    links.forEach(function (link) {
      var id = link.getAttribute("href").split("#")[1];
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) return;
      map[id] = link;
      targets.push(el);
    });

    if (!targets.length) return;

    var visible = {};

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible[entry.target.id] = entry.isIntersecting;
        });

        var current = null;
        targets.forEach(function (el) {
          if (visible[el.id] && !current) current = el.id;
        });

        if (!current) return;
        links.forEach(function (l) {
          l.classList.remove("is-active");
        });
        if (map[current]) map[current].classList.add("is-active");
      },
      { rootMargin: "-8% 0px -70% 0px", threshold: 0 }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------- 3. Mobile nav + back to top ------------------------- */
  function initFloatingControls() {
    var fab = document.querySelector(".nav-fab");
    var nav = document.querySelector(".site-nav");

    if (fab && nav) {
      fab.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        fab.setAttribute("aria-expanded", open ? "true" : "false");
      });
      nav.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          nav.classList.remove("is-open");
          fab.setAttribute("aria-expanded", "false");
        }
      });
    }

    var top = document.querySelector(".to-top");
    if (!top) return;

    var ticking = false;
    function update() {
      var y = window.pageYOffset || root.scrollTop;
      top.classList.toggle("is-visible", y > 420);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();

    top.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 4. Heading anchors ---------------------------------- */
  function initAnchors() {
    var headings = document.querySelectorAll(".content h2[id], .content h3[id]");
    [].forEach.call(headings, function (h) {
      var a = document.createElement("a");
      a.className = "heading-anchor";
      a.href = "#" + h.id;
      a.setAttribute("aria-label", "Permalink to “" + h.textContent.trim() + "”");
      a.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i>';
      h.appendChild(a);
    });
  }

  /* ---------- 5. Image lightbox ----------------------------------- */
  function initLightbox() {
    var images = document.querySelectorAll(
      ".content figure img, .content p > img, .content td img"
    );
    if (!images.length) return;

    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Enlarged image");
    var big = document.createElement("img");
    big.alt = "";
    box.appendChild(big);
    document.body.appendChild(box);

    function close() {
      box.classList.remove("is-open");
      big.removeAttribute("src");
    }

    [].forEach.call(images, function (img) {
      if (img.closest("a")) return; // linked images keep their link
      img.classList.add("zoomable");
      img.addEventListener("click", function () {
        big.src = img.currentSrc || img.src;
        big.alt = img.alt || "";
        box.classList.add("is-open");
      });
    });

    box.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- 6. Collapsible news feed ---------------------------- */
  function initNewsToggle() {
    var wrap = document.querySelector(".news-collapse");
    var btn = document.querySelector(".news-toggle");
    if (!wrap || !btn) return;

    btn.addEventListener("click", function () {
      var open = wrap.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.innerHTML = open
        ? '<i class="fa-solid fa-chevron-up" aria-hidden="true"></i> Show recent updates only'
        : '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i> Show the full news archive';
      if (!open) wrap.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  /* ---------- 7. Blank table headers ------------------------------ */
  function initTables() {
    var heads = document.querySelectorAll(".content table thead");
    [].forEach.call(heads, function (head) {
      var cells = [].slice.call(head.querySelectorAll("th"));
      // kramdown fills an empty markdown header row with &nbsp;
      var blank = cells.every(function (c) {
        return c.textContent.replace(/[\s\u00a0]/g, "") === "";
      });
      if (cells.length && blank) head.hidden = true;
    });
  }

  function init() {
    initTheme();
    initScrollSpy();
    initFloatingControls();
    initAnchors();
    initLightbox();
    initNewsToggle();
    initTables();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
