#!/usr/bin/env node
/* ===========================================================
   BUILD STEP  —  run:  node build.mjs

   Reads data.js + style.css and writes finished HTML pages
   with the lists already rendered and the CSS inlined.

   You still only ever edit data.js. This just does the work
   ahead of time so the browser doesn't have to.
   =========================================================== */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";

const root = new URL(".", import.meta.url).pathname;
const read = (f) => readFileSync(root + f, "utf8");

/* ---- 1. Evaluate data.js to get the lists ---------------- */

const ctx = {};
try {
  vm.createContext(ctx);
  vm.runInContext(read("data.js") + "\nthis.SITE=SITE;this.MOVIES=MOVIES;this.ESSAYS=ESSAYS;this.BOOKS=BOOKS;", ctx);
} catch (err) {
  console.error("\n  data.js has an error — nothing was built.\n");
  console.error("  " + err.message + "\n");
  console.error("  Usually a missing comma between two { } entries.\n");
  process.exit(1);
}

const { SITE, MOVIES, ESSAYS, BOOKS } = ctx;

/* ---- 2. Page definitions --------------------------------- */

const PAGES = [
  { file: "index.html", label: "Home", heading: "Welcome" },
  { file: "movies.html", label: "Movies to Watch", items: MOVIES },
  { file: "essays.html", label: "Essays to Read", items: ESSAYS },
  { file: "books.html", label: "Books to Read", items: BOOKS },
];

/* ---- 3. Helpers ------------------------------------------ */

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );

function navFor(current) {
  return PAGES.map((p) => {
    const cls = p.file === current ? ' class="current" aria-current="page"' : "";
    return `<a href="${p.file}"${cls}>${esc(p.label)}</a>`;
  }).join("");
}

function listFor(items) {
  if (!items || !items.length) return "<p>Nothing here yet.</p>";
  return (
    '<ul class="entries">' +
    items
      .map((it) => {
        const title = it.link
          ? `<a href="${esc(it.link)}" rel="noopener">${esc(it.title)}</a>`
          : esc(it.title);
        return (
          `<li${it.done ? ' class="done"' : ""}>` +
          `<div class="entry-title">${title}</div>` +
          (it.meta ? `<div class="entry-meta">${esc(it.meta)}</div>` : "") +
          (it.note ? `<div class="entry-note">${esc(it.note)}</div>` : "") +
          "</li>"
        );
      })
      .join("") +
    "</ul>"
  );
}

const HOME_BODY = `
  <h2>Welcome</h2>
  <p>
    This is a small personal site: a place to keep track of what I mean to
    watch, read, and think about. Nothing here is finished, which is more
    or less the point.
  </p>
  <p>
    The lists live under the tabs above &mdash;
    <a href="movies.html">movies</a>,
    <a href="essays.html">essays</a>, and
    <a href="books.html">books</a>.
    Items get crossed off rather than deleted.
  </p>`;

/* ---- 4. Speed machinery ---------------------------------- */

// Tells Chrome to quietly pre-render a page when you hover a link.
const SPECULATION = `<script type="speculationrules">
{"prerender":[{"where":{"selector_matches":"nav a, .page a[href$='.html']"},"eagerness":"moderate"}]}
</script>`;

// Fallback for browsers without speculation rules: warm the cache
// on hover, and hand off to the service worker for repeat visits.
const RUNTIME = `<script>
(function(){
  var seen={};
  function warm(u){ if(seen[u])return; seen[u]=1;
    var l=document.createElement("link"); l.rel="prefetch"; l.href=u; document.head.appendChild(l); }
  addEventListener("pointerover",function(e){
    var a=e.target.closest&&e.target.closest('a[href$=".html"]');
    if(a&&a.origin===location.origin) warm(a.href);
  },{passive:true});
  addEventListener("load",function(){
    (window.requestIdleCallback||setTimeout)(function(){
      document.querySelectorAll('nav a').forEach(function(a){ warm(a.href); });
    });
    if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function(){});
  });
})();
</script>`;

/* ---- 5. Write the pages ---------------------------------- */

const css = read("style.css").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();

let built = [];
for (const p of PAGES) {
  const body = p.items ? `\n  <h2>${esc(p.label)}</h2>\n  ${listFor(p.items)}` : HOME_BODY;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.file === "index.html" ? SITE.name : p.label + " — " + SITE.name)}</title>
<meta name="description" content="${esc(SITE.tagline)}">
<style>${css}</style>
${SPECULATION}
</head>
<body>
<div class="page">
  <header class="masthead">
    <h1>${esc(SITE.name)}</h1>
    <p class="tagline">${esc(SITE.tagline)}</p>
  </header>
  <nav>${navFor(p.file)}</nav>
${body}

  <footer>Edit <code>data.js</code>, then run <code>node build.mjs</code>.</footer>
</div>
${RUNTIME}
</body>
</html>
`;
  writeFileSync(root + p.file, html);
  built.push([p.file, Buffer.byteLength(html)]);
}

/* ---- 6. Service worker, versioned by content ------------- */

const version = createHash("sha1")
  .update(built.map((b) => b[1]).join() + css)
  .digest("hex")
  .slice(0, 8);

writeFileSync(
  root + "sw.js",
  `/* generated by build.mjs — do not edit */
const V = "site-${version}";
const ASSETS = [${PAGES.map((p) => `"${p.file}"`).join(",")},"./"];
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then((c) => c.addAll(ASSETS).catch(() => {})));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) =>
    Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))
  ).then(() => self.clients.claim()));
});
// Network-first, falling back to cache. The network is normally ~30ms,
// so this stays fast while guaranteeing you never see a stale page
// after pushing an update. The cache is what makes it work offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(V).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || Response.error()))
  );
});
`
);

console.log("\n  built " + built.length + " pages  (sw version " + version + ")\n");
for (const [f, n] of built) console.log("    " + f.padEnd(14) + (n / 1024).toFixed(1) + " KB");
console.log("");
