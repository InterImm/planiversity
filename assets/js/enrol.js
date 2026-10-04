// Enrolment: draws a Planetary University student ID on a canvas, in the browser.
// The card is fully described by the URL (?n=name&d=department&c=city&e=enrolment date),
// so a shared link draws the same card. Nothing is sent anywhere.
(function () {
  "use strict";

  var data = JSON.parse(document.getElementById("enrol-data").textContent);
  var form = document.getElementById("enrol-form");
  var figure = document.getElementById("enrol-card");
  var canvas = figure.querySelector("canvas");
  var download = document.getElementById("enrol-download");
  var copy = document.getElementById("enrol-copy");
  var t = data.t, zh = data.lang !== "en";

  // Story time runs 70,491 days ahead of real time (InterImm present = 2219).
  var STORY_SHIFT_MS = 70491 * 86400000;
  function msd(ms) {
    if (window.InterImm && InterImm.astro && InterImm.astro.msd) return InterImm.astro.msd(ms);
    return (ms / 86400000 + 2440587.5 + 69.184 / 86400 - 2405522.0028779) / 1.0274912517;
  }
  function ymd(d) { return d.toISOString().slice(0, 10); }

  // Small stable hash for the student number.
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-6);
  }

  var INK = "#17171a", PAPER = "#f5f3ec", MUTED = "#6b6a66", RULE = "#cfccc2", RUST = "#b0441c";
  var SERIF = '"Source Serif 4", Georgia, "Noto Serif SC", "Songti SC", serif';
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  var SANS = '"IBM Plex Sans", system-ui, "PingFang SC", "Noto Sans SC", sans-serif';

  function seal(ctx, cx, cy, r) {
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r - 9, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.66, 0, 2 * Math.PI); ctx.stroke();
    // ring text
    var text = "PLANETARY UNIVERSITY · 行星大学 · ISIDIS · MARS · ";
    ctx.fillStyle = INK; ctx.font = "500 " + Math.round(r * 0.095) + "px " + MONO;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var chars = Array.from(text), step = (2 * Math.PI) / chars.length;
    chars.forEach(function (ch, i) {
      var a = -Math.PI / 2 + i * step;
      ctx.save(); ctx.translate(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); ctx.rotate(a + Math.PI / 2);
      ctx.fillText(ch, 0, 0); ctx.restore();
    });
    // planet, orbit and moon
    ctx.strokeStyle = RUST; ctx.fillStyle = "rgba(176,68,28,0.14)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.56, r * 0.19, -0.31, 0, 2 * Math.PI); ctx.stroke();
    ctx.setLineDash([]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.16, r * 0.045, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = INK; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
    [-0.1, 0.03, 0.16].forEach(function (dy) {
      ctx.beginPath(); ctx.moveTo(cx - r * 0.26, cy + r * dy); ctx.quadraticCurveTo(cx, cy + r * (dy + 0.06), cx + r * 0.26, cy + r * dy); ctx.stroke();
    });
    ctx.restore();
  }

  function fitText(ctx, text, font, size, max) {
    do { ctx.font = font.replace("{s}", size); size -= 2; } while (ctx.measureText(text).width > max && size > 20);
  }

  function draw(card) {
    var W = canvas.width, H = canvas.height, ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    // card body
    ctx.fillStyle = PAPER;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 34); ctx.fill();
    ctx.strokeStyle = RULE; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(1, 1, W - 2, H - 2, 33); ctx.stroke();
    // top band
    ctx.fillStyle = INK; ctx.fillRect(0, 96, W, 2);
    ctx.fillStyle = RUST; ctx.fillRect(56, 40, 14, 14);
    ctx.fillStyle = INK; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.font = "500 30px " + SERIF; ctx.fillText(t.name, 84, 56);
    ctx.font = "400 17px " + MONO; ctx.fillStyle = MUTED; ctx.fillText(t.other.toUpperCase() + "  ·  " + t.center, 84, 82);
    ctx.textAlign = "right"; ctx.font = "500 18px " + MONO; ctx.fillStyle = RUST;
    ctx.fillText(t.title.toUpperCase(), W - 56, 56);
    ctx.textAlign = "left";

    // seal
    seal(ctx, 214, 330, 148);

    // fields
    var x = 420, maxW = W - x - 56;
    ctx.fillStyle = MUTED; ctx.font = "400 16px " + MONO; ctx.fillText(t.holder.toUpperCase(), x, 160);
    ctx.fillStyle = INK; fitText(ctx, card.name, "400 {s}px " + SERIF, 68, maxW); ctx.fillText(card.name, x, 236);
    ctx.fillStyle = RUST; ctx.font = "500 28px " + SANS; ctx.fillText(card.dept, x, 282);

    var rows = [[t.no, card.no], [t.enrolled, card.enrolled + "  ·  " + t.sol + " " + card.sol], [t.valid, card.valid], [t.city, card.city]];
    ctx.strokeStyle = RULE; ctx.lineWidth = 1;
    rows.forEach(function (r, i) {
      var y = 330 + i * 54;
      ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(W - 56, y - 24); ctx.stroke();
      ctx.fillStyle = MUTED; ctx.font = "400 15px " + MONO; ctx.fillText(r[0].toUpperCase(), x, y);
      ctx.fillStyle = INK; ctx.font = "400 22px " + (i === 0 ? MONO : SANS); ctx.fillText(r[1], x + 150, y);
    });

    // machine-readable line
    ctx.fillStyle = INK; ctx.fillRect(0, H - 78, W, 1);
    ctx.font = "400 22px " + MONO; ctx.fillStyle = INK;
    var mrz = ("PU<" + card.code + "<" + card.no.slice(-6) + "<<" + card.enrolled.replace(/-/g, "") + "<<<<<<<<<<<<<<<<<<<<<<<<").slice(0, 52);
    ctx.fillText(mrz, 56, H - 34);
  }

  function cardFrom(params) {
    var name = (params.get("n") || "").trim().slice(0, 24);
    var d = data.depts[params.get("d")] ? params.get("d") : Object.keys(data.depts)[0];
    var c = data.cities[params.get("c")] ? params.get("c") : Object.keys(data.cities)[0];
    var e = /^\d{4}-\d{2}-\d{2}$/.test(params.get("e") || "") ? params.get("e") : ymd(new Date(Date.now() + STORY_SHIFT_MS));
    var enrolled = new Date(e + "T12:00:00Z");
    // A course runs four Mars years (2,674 sols, about 7.5 Earth years).
    var valid = new Date(enrolled.getTime() + 2674 * 88775244);
    var sol = Math.floor(msd(enrolled.getTime()));
    return {
      name: name, d: d, c: c, e: e, code: data.depts[d].code,
      dept: data.depts[d].name, city: data.cities[c],
      no: "PU-" + e.slice(0, 4) + "-" + data.depts[d].code + "-" + hash(name + "|" + d + "|" + e),
      enrolled: e, valid: ymd(valid), sol: sol.toLocaleString("en-US")
    };
  }

  function show(card) {
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    // Ask for the faces the canvas uses so they load even if the page hasn't shown them yet.
    if (document.fonts && document.fonts.load) {
      ["400 20px \"Source Serif 4\"", "500 20px \"IBM Plex Mono\"", "400 20px \"IBM Plex Sans\""].forEach(function (f) { document.fonts.load(f, card.name).catch(function () {}); });
    }
    ready.then(function () {
      draw(card);
      figure.hidden = false;
      download.href = canvas.toDataURL("image/png");
      download.download = "planiversity-" + card.no.toLowerCase() + ".png";
    });
  }

  function url(card) {
    var u = new URL(location.href);
    u.search = new URLSearchParams({ n: card.name, d: card.d, c: card.c, e: card.e }).toString();
    u.hash = "";
    return u.toString();
  }

  var params = new URLSearchParams(location.search);
  if (params.get("d") && data.depts[params.get("d")]) form.elements.d.value = params.get("d");
  if (params.get("c") && data.cities[params.get("c")]) form.elements.c.value = params.get("c");
  if (params.get("n")) { form.elements.n.value = params.get("n").slice(0, 24); show(cardFrom(params)); }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var p = new URLSearchParams({ n: form.elements.n.value, d: form.elements.d.value, c: form.elements.c.value });
    if (params.get("e") && params.get("n") === form.elements.n.value) p.set("e", params.get("e"));
    var card = cardFrom(p);
    if (!card.name) return;
    history.replaceState(null, "", url(card));
    params = new URLSearchParams(location.search);
    show(card);
    figure.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  copy.addEventListener("click", function () {
    var done = function () { var label = copy.textContent; copy.textContent = copy.dataset.done; setTimeout(function () { copy.textContent = label; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, function () {}); else done();
  });
})();
