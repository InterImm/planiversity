// Live facility readings on department pages. Reads the Mars Open Facilities index
// (the first source that answers) and fills each [data-facilities] list with the
// facilities it names, in the order given.
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmt(v, lang) {
    if (typeof v !== "number" || !isFinite(v)) return "–";
    var digits = Math.abs(v) >= 100 ? 0 : 1;
    return v.toLocaleString(lang === "en" ? "en-US" : "zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function load(sources) {
    var i = 0;
    function next() {
      if (i >= sources.length) return Promise.reject(new Error("no source"));
      var url = sources[i++];
      return fetch(url, { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(next);
    }
    return next();
  }

  function card(f, list, lang) {
    var t = list.dataset, zh = lang !== "en";
    var status = f.status || "operating";
    var statusLabel = status === "offline" ? t.tOfflineStatus : t["t" + status.charAt(0).toUpperCase() + status.slice(1)] || status;
    var kpis = (f.kpis || []).map(function (k) {
      return '<div><dt>' + esc(k.label) + '</dt><dd><b>' + fmt(k.value, lang) + '</b> ' + esc(k.unit) +
        (k.design != null ? '<span class="facility-design">' + esc(t.tDesign) + ' ' + fmt(k.design, lang) + '</span>' : '') + '</dd></div>';
    }).join("");
    var href = t.dashboard + "#" + encodeURIComponent(f.id);
    return '<li class="card facility-card">' +
      '<div class="facility-head"><h3 class="card-title"><a href="' + esc(href) + '">' + esc(zh ? f.name_zh || f.name : f.name) + '</a></h3>' +
      '<span class="facility-status" data-status="' + esc(status) + '">' + esc(statusLabel) + '</span></div>' +
      '<p class="facility-place kicker">' + esc(zh ? f.city_zh || f.city : f.city) + (f.since ? ' · ' + esc(f.since) : '') + '</p>' +
      (!zh && f.summary ? '<p class="facility-summary">' + esc(f.summary) + '</p>' : '') +
      '<dl class="facility-kpis">' + kpis + '</dl>' +
      '<p class="card-cta"><a class="text-link" href="' + esc(href) + '">' + esc(t.tOpen) + ' <span aria-hidden="true">↗</span></a></p>' +
      '</li>';
  }

  var lists = document.querySelectorAll("[data-facilities]");
  if (!lists.length) return;
  var sources = lists[0].dataset.sources.split(/\s+/).filter(Boolean);
  load(sources).then(function (index) {
    var byId = {};
    (index.facilities || []).forEach(function (f) { byId[f.id] = f; });
    lists.forEach(function (list) {
      var lang = list.dataset.lang;
      var html = list.dataset.facilities.split(/\s+/).map(function (id) { return byId[id] ? card(byId[id], list, lang) : ""; }).join("");
      list.innerHTML = html || '<li class="facility-loading">' + esc(list.dataset.tOffline) + '</li>';
    });
  }).catch(function () {
    lists.forEach(function (list) {
      list.innerHTML = '<li class="facility-loading"><a href="' + esc(list.dataset.dashboard) + '">' + esc(list.dataset.tOffline) + '</a></li>';
    });
  });
})();
