/* Site behaviour.
 *
 *  1. Header: hairline once the page scrolls; current section in the nav.
 *  2. Sections fade in as they enter the viewport.
 *  3. Charts: each <figure class="viz"> carries a data table; this script
 *     draws an SVG chart from it, animates it in once, and keeps the table
 *     available under "Data table".
 *  4. Image lightbox and blank table headers on the gallery pages.
 *
 * Everything degrades to plain content: without JavaScript the tables show
 * and nothing is hidden.
 */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function $all(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  function svg(tag, attrs, parent) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(el);
    return el;
  }

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

      // On narrow screens the nav scrolls sideways; keep the active link in view
      // without moving the page.
      if (active >= 0 && nav && nav.scrollWidth > nav.clientWidth) {
        var a = links[active];
        var left = a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2;
        nav.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
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
    $all(".intro > *, .page > .section").forEach(function (el, i) {
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

  /* 3. Charts ---------------------------------------------------------- */

  function readTable(table) {
    var head = $all("thead th", table).map(function (th) { return th.textContent.trim(); });
    var rows = $all("tbody tr", table).map(function (tr) {
      return $all("th, td", tr).map(function (td) { return td.textContent.trim(); });
    });
    return { head: head, rows: rows };
  }

  function niceStep(max, target) {
    var raw = max / Math.max(1, target);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * mag >= raw) return Math.max(1, steps[i] * mag);
    }
    return 10 * mag;
  }

  function fmt(n) { return Number(n).toLocaleString("en-US"); }

  function roundedTop(x, yTop, w, yBase, r) {
    var h = yBase - yTop;
    r = Math.max(0, Math.min(r, w / 2, h));
    return "M" + x + "," + yBase +
      "V" + (yTop + r) +
      "Q" + x + "," + yTop + " " + (x + r) + "," + yTop +
      "H" + (x + w - r) +
      "Q" + (x + w) + "," + yTop + " " + (x + w) + "," + (yTop + r) +
      "V" + yBase + "Z";
  }

  // One tooltip per figure. Content is built with textContent only.
  function makeTip(canvas) {
    var tip = document.createElement("div");
    tip.className = "viz-tip";
    tip.setAttribute("aria-hidden", "true");
    canvas.appendChild(tip);
    return {
      show: function (head, rows, anchorX, anchorY) {
        tip.textContent = "";
        var h = document.createElement("div");
        h.className = "tip-head";
        h.textContent = head;
        tip.appendChild(h);
        rows.forEach(function (r) {
          var row = document.createElement("div");
          row.className = "tip-row";
          if (r.color) {
            var k = document.createElement("span");
            k.className = "tip-key";
            k.style.setProperty("--k", r.color);
            row.appendChild(k);
          }
          var v = document.createElement("span");
          v.className = "v";
          v.textContent = r.value;
          row.appendChild(v);
          var l = document.createElement("span");
          l.textContent = r.label;
          row.appendChild(l);
          tip.appendChild(row);
        });
        var cw = canvas.clientWidth;
        var tw = tip.offsetWidth;
        var th = tip.offsetHeight;
        var left = Math.max(0, Math.min(cw - tw, anchorX - tw / 2));
        var top = anchorY - th - 10;
        if (top < -8) top = anchorY + 14;
        tip.style.transform = "";
        tip.style.left = left + "px";
        tip.style.top = top + "px";
        tip.classList.add("is-on");
      },
      hide: function () { tip.classList.remove("is-on"); }
    };
  }

  // Arrow keys move between marks; only one mark is in the tab order.
  function rovingFocus(svgEl, hits) {
    if (!hits.length) return;
    hits.forEach(function (h, i) { h.setAttribute("tabindex", i === 0 ? "0" : "-1"); });
    svgEl.addEventListener("keydown", function (e) {
      var i = hits.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(hits.length - 1, i + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, i - 1);
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = hits.length - 1;
      if (next === null) return;
      e.preventDefault();
      hits[i].setAttribute("tabindex", "-1");
      hits[next].setAttribute("tabindex", "0");
      hits[next].focus();
    });
  }

  var SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

  // Column chart, one or more stacked series. Table: label | series...
  function drawColumns(fig, canvas, data, tip, mount) {
    var W = Math.max(240, canvas.clientWidth);
    var plotH = Number(fig.getAttribute("data-height")) || 170;
    var m = { top: 24, right: 4, bottom: 26, left: 30 };
    var H = m.top + plotH + m.bottom;
    var names = data.head.slice(1);
    var rows = data.rows.map(function (r) {
      var vals = r.slice(1).map(function (v) { return Number(v.replace(/[^0-9.]/g, "")) || 0; });
      return { label: r[0], vals: vals, total: vals.reduce(function (a, b) { return a + b; }, 0) };
    });
    var maxTotal = Math.max.apply(null, rows.map(function (r) { return r.total; }).concat([1]));
    var step = niceStep(maxTotal, 4);
    var top = Math.ceil(maxTotal / step) * step;
    var plotW = W - m.left - m.right;
    var band = plotW / rows.length;
    var barW = Math.min(24, Math.max(6, band * 0.58));
    var y = function (v) { return m.top + plotH - (v / top) * plotH; };
    var base = y(0);
    var unit = fig.getAttribute("data-unit") || "";

    var root = svg("svg", {
      viewBox: "0 0 " + W + " " + H,
      width: W, height: H,
      role: "group",
      "aria-label": fig.getAttribute("data-label") || ""
    });
    mount(root);

    var grid = svg("g", { "aria-hidden": "true" }, root);
    for (var t = 0; t <= top + 1e-9; t += step) {
      var gy = Math.round(y(t)) + 0.5;
      svg("line", { x1: m.left, x2: W - m.right, y1: gy, y2: gy, "class": t === 0 ? "baseline" : "grid" }, grid);
      var tl = svg("text", { x: m.left - 8, y: gy + 3.5, "text-anchor": "end" }, grid);
      tl.textContent = fmt(t);
    }

    var showEvery = band < 30 ? 2 : 1;
    var hits = [];
    var cols = svg("g", null, root);

    rows.forEach(function (r, i) {
      var cx = m.left + band * (i + 0.5);
      var x = cx - barW / 2;
      var col = svg("g", { "class": "col", style: "transform-origin: 0px " + base + "px; --d: " + (i * 0.07) + "s" }, cols);
      var acc = 0;
      var last = -1;
      r.vals.forEach(function (v, j) { if (v > 0) last = j; });
      r.vals.forEach(function (v, j) {
        if (v <= 0) return;
        var yb = y(acc);
        var yt = y(acc + v);
        if (acc > 0) yb -= 2;              // 2px surface gap between segments
        acc += v;
        if (yb - yt < 1) yt = yb - 1;
        var d = j === last
          ? roundedTop(x, yt, barW, yb, 4)
          : "M" + x + "," + yb + "V" + yt + "H" + (x + barW) + "V" + yb + "Z";
        svg("path", { d: d, "class": "mark s" + (j + 1) }, col);
      });

      if (i % showEvery === 0 || i === rows.length - 1) {
        var xl = svg("text", { x: cx, y: base + 17, "text-anchor": "middle", "aria-hidden": "true" }, root);
        xl.textContent = r.label;
      }

      var colTop = y(r.total);
      var hit = svg("rect", {
        x: cx - band / 2, y: m.top - 6, width: band, height: plotH + 6,
        "class": "hit", role: "img",
        "aria-label": r.label + ": " + names.map(function (n, j) { return fmt(r.vals[j]) + " " + n.toLowerCase(); }).join(", ")
      }, root);
      svg("rect", { x: x - 3, y: colTop - 3, width: barW + 6, height: base - colTop + 3, rx: 4, "class": "focus-ring" }, root);
      hits.push(hit);

      var on = function () {
        col.classList.add("is-hot");
        var tipRows = names.map(function (n, j) {
          return { value: fmt(r.vals[j]), label: n.toLowerCase(), color: names.length > 1 ? SERIES[j] : null };
        });
        if (names.length > 1) tipRows.push({ value: fmt(r.total), label: "in total" });
        else if (unit) tipRows[0].label = unit;
        tip.show(r.label, tipRows, cx, colTop);
      };
      var off = function () { col.classList.remove("is-hot"); tip.hide(); };
      hit.addEventListener("pointerenter", on);
      hit.addEventListener("pointerleave", off);
      hit.addEventListener("focus", on);
      hit.addEventListener("blur", off);
    });

    // Direct label: the latest column only.
    var lastRow = rows[rows.length - 1];
    if (lastRow) {
      var lx = m.left + band * (rows.length - 0.5);
      var vl = svg("text", {
        x: lx, y: y(lastRow.total) - 7, "text-anchor": "middle",
        "class": "val lbl-fade", style: "--d: " + ((rows.length - 1) * 0.07) + "s", "aria-hidden": "true"
      }, root);
      vl.textContent = fmt(lastRow.total);
    }

    rovingFocus(root, hits);
    return root;
  }

  function parseMonth(s) {
    var m = /^(\d{4})-(\d{2})$/.exec(s || "");
    return m ? { y: +m[1], m: +m[2] } : null;
  }
  function monthText(p) { return MONTHS[p.m - 1] + " " + p.y; }

  // Range bars grouped into lanes. Table: group | label | start | end
  function drawTimeline(fig, canvas, data, tip, mount) {
    var W = Math.max(260, canvas.clientWidth);
    var now = parseMonth(fig.getAttribute("data-now"));
    var nowV = now ? now.y + now.m / 12 : new Date().getFullYear() + (new Date().getMonth() + 1) / 12;

    var groups = [];
    data.rows.forEach(function (r) {
      var g = groups.length && groups[groups.length - 1].name === r[0] ? groups[groups.length - 1] : null;
      if (!g) { g = { name: r[0], items: [] }; groups.push(g); }
      var s = parseMonth(r[2]);
      var e = parseMonth(r[3]);
      if (!s) return;
      g.items.push({
        label: r[1], s: s, e: e,
        v0: s.y + (s.m - 1) / 12,
        v1: e ? e.y + e.m / 12 : nowV
      });
    });

    var all = [].concat.apply([], groups.map(function (g) { return g.items; }));
    var minV = Math.floor(Math.min.apply(null, all.map(function (i) { return i.v0; })));
    var maxV = Math.ceil(Math.max.apply(null, all.map(function (i) { return i.v1; })) + 0.01);
    var m = { top: 4, right: 6, bottom: 24, left: 0 };
    var groupH = 26;
    var rowH = 31;
    var H = m.top + groups.length * groupH + all.length * rowH + m.bottom;
    var plotW = W - m.left - m.right;
    var x = function (v) { return m.left + ((v - minV) / (maxV - minV)) * plotW; };

    var root = svg("svg", {
      viewBox: "0 0 " + W + " " + H, width: W, height: H,
      role: "group", "aria-label": fig.getAttribute("data-label") || ""
    });
    mount(root);

    var yearsSpan = maxV - minV;
    var every = plotW / yearsSpan < 44 ? 2 : 1;
    var axisY = H - m.bottom;
    var grid = svg("g", { "aria-hidden": "true" }, root);
    for (var yv = minV; yv <= maxV; yv++) {
      var gx = Math.round(x(yv)) + 0.5;
      svg("line", { x1: gx, x2: gx, y1: m.top, y2: axisY, "class": "grid" }, grid);
      if ((yv - minV) % every === 0) {
        var anchor = yv === minV ? "start" : (yv === maxV ? "end" : "middle");
        var t = svg("text", { x: gx, y: axisY + 16, "text-anchor": anchor }, grid);
        t.textContent = String(yv);
      }
    }
    svg("line", { x1: m.left, x2: W - m.right, y1: axisY + 0.5, y2: axisY + 0.5, "class": "baseline" }, grid);

    var hits = [];
    var yCur = m.top;
    var k = 0;
    groups.forEach(function (g, gi) {
      var gl = svg("text", { x: m.left, y: yCur + 17, "class": "group-label", "aria-hidden": "true" }, root);
      gl.textContent = g.name;
      yCur += groupH;
      g.items.forEach(function (it) {
        var x0 = x(it.v0);
        var x1 = Math.max(x0 + 4, x(it.v1));
        var barY = yCur + 16;
        var barH = 9;
        var bar = svg("rect", {
          x: x0, y: barY, width: x1 - x0, height: barH, rx: 4,
          "class": "bar mark s" + ((gi % 3) + 1),
          style: "transform-origin: " + x0 + "px " + (barY + barH / 2) + "px; --d: " + (k * 0.06) + "s"
        }, root);

        var lab = svg("text", { x: x0, y: yCur + 11, "class": "row-label lbl-fade", style: "--d: " + (k * 0.06) + "s", "aria-hidden": "true" }, root);
        lab.textContent = it.label;
        var tw = lab.getComputedTextLength ? lab.getComputedTextLength() : 0;
        if (x0 + tw > W - m.right) lab.setAttribute("x", Math.max(m.left, x1 - tw));

        var when = monthText(it.s) + " – " + (it.e ? monthText(it.e) : "present");
        var hit = svg("rect", {
          x: 0, y: yCur, width: W, height: rowH, "class": "hit", role: "img",
          "aria-label": it.label + ", " + when
        }, root);
        svg("rect", { x: x0 - 3, y: barY - 3, width: x1 - x0 + 6, height: barH + 6, rx: 6, "class": "focus-ring" }, root);
        hits.push(hit);

        var color = SERIES[gi % 3];
        var on = function () {
          bar.classList.add("is-hot");
          tip.show(g.name, [{ value: when, label: "", color: color }, { value: "", label: it.label }], (x0 + x1) / 2, barY);
        };
        var off = function () { bar.classList.remove("is-hot"); tip.hide(); };
        hit.addEventListener("pointerenter", on);
        hit.addEventListener("pointerleave", off);
        hit.addEventListener("focus", on);
        hit.addEventListener("blur", off);

        yCur += rowH;
        k++;
      });
    });

    rovingFocus(root, hits);
    return root;
  }

  var DRAW = { columns: drawColumns, timeline: drawTimeline };

  function initCharts() {
    $all("figure.viz[data-chart]").forEach(function (fig) {
      var kind = fig.getAttribute("data-chart");
      var table = fig.querySelector("table");
      var canvas = fig.querySelector(".viz-canvas");
      if (!DRAW[kind] || !table || !canvas) return;
      var data = readTable(table);
      var tip = makeTip(canvas);
      var drawn = false;
      var current = null;
      var lastW = 0;

      function render(animate) {
        var w = canvas.clientWidth;
        if (!w || w === lastW) return;
        lastW = w;
        // The draw functions mount their SVG first (labels are measured in
        // place), so the class goes on before the browser paints it.
        var next = DRAW[kind](fig, canvas, data, tip, function (el) {
          el.classList.add(animate ? "is-armed" : "is-drawn");
          canvas.insertBefore(el, canvas.firstChild);
        });
        if (current && current.parentNode) current.parentNode.removeChild(current);
        current = next;
      }

      try {
        render(!reduceMotion);
      } catch (err) {
        return; // leave the table visible
      }
      var details = fig.querySelector("details.viz-data");
      if (details) details.removeAttribute("open");

      function play() {
        if (drawn || !current) return;
        drawn = true;
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            current.classList.remove("is-armed");
            current.classList.add("is-drawn");
          });
        });
      }

      if (reduceMotion || !("IntersectionObserver" in window)) {
        drawn = true;
      } else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { play(); io.disconnect(); } });
        }, { threshold: 0.35 });
        io.observe(canvas);
      }

      var timer = null;
      window.addEventListener("resize", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          var w = canvas.clientWidth;
          if (w && w !== lastW) {
            render(false);
            drawn = true;
          }
        }, 120);
      });
    });
  }

  /* 4. Gallery helpers -------------------------------------------------- */

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
    initCharts();
    initLightbox();
    hideBlankTableHeads();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
