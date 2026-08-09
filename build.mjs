#!/usr/bin/env node
/* ===========================================================
   BUILD STEP  —  run:  node build.mjs

   Reads data.js, style.css and essays/*.md, then writes the
   finished HTML with everything already rendered in.

   You edit:  data.js  (lists)  ·  essays/*.md  (readable texts)
   You never edit: index/movies/essays/books.html, read/*, sw.js
   =========================================================== */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, cpSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { markdown, readingTime } from "./lib/markdown.mjs";

const root = new URL(".", import.meta.url).pathname;
const read = (f) => readFileSync(root + f, "utf8");

/* ---- 0. Mode --------------------------------------------
   Default is the PUBLIC build: lists only, every essay links
   out to its original. This is what gets committed.

   --reader builds a second, complete copy into local/ that
   includes the in-site reader. local/ and essays/ are
   gitignored, so a private copy can never be pushed by
   accident, even if you forget which mode you last ran.
   ---------------------------------------------------------- */

const READER = process.argv.includes("--reader");
const OUT = READER ? root + "local/" : root;
if (READER && !existsSync(OUT)) mkdirSync(OUT, { recursive: true });

/* ---- 1. Evaluate data.js --------------------------------- */

const ctx = {};
try {
  vm.createContext(ctx);
  vm.runInContext(
    read("data.js") + "\nthis.SITE=SITE;this.MOVIES=MOVIES;this.ESSAYS=ESSAYS;this.BOOKS=BOOKS;",
    ctx
  );
} catch (err) {
  console.error("\n  data.js has an error — nothing was built.\n");
  console.error("  " + err.message + "\n");
  console.error("  Usually a missing comma between two { } entries.\n");
  process.exit(1);
}
const { SITE, MOVIES, ESSAYS, BOOKS } = ctx;

/* ---- 2. Helpers ------------------------------------------ */

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

const NAV = [
  { file: "index.html", label: "Home" },
  { file: "movies.html", label: "Movies to Watch" },
  { file: "essays.html", label: "Essays to Read" },
  { file: "books.html", label: "Books to Read" },
];

function navFor(current, prefix = "") {
  return NAV.map((p) => {
    const cls = p.file === current ? ' class="current" aria-current="page"' : "";
    return `<a href="${prefix}${p.file}"${cls}>${esc(p.label)}</a>`;
  }).join("");
}

/* ---- 3. Resolve which essays have a local text ----------- */

const essaysDir = root + "essays/";
if (!existsSync(essaysDir)) mkdirSync(essaysDir);

for (const e of ESSAYS) {
  if (!e.file) continue;
  const path = essaysDir + e.file;
  if (!existsSync(path)) {
    console.error(`\n  data.js points at essays/${e.file}, which doesn't exist.\n`);
    process.exit(1);
  }
  e._src = readFileSync(path, "utf8");
  e._slug = slug(e.title);
  e._href = "read/" + e._slug + ".html";
}

/* ---- 3b. Local files (private build only) ----------------
   A  local: "Some Book.pdf"  field points at files/Some Book.pdf,
   which is gitignored. Browsers refuse to follow file:// links
   from a web page, so the private build copies the file in and
   links to it over http instead. The public build omits it. --- */

const filesDir = root + "files/";
let localFileCount = 0;

for (const item of [...MOVIES, ...ESSAYS, ...BOOKS]) {
  if (typeof item.link === "string" && item.link.startsWith("file://")) {
    console.warn(
      "  ! " + item.title + "\n" +
      "    link: uses file:// — browsers block those from a web page.\n" +
      "    Put the file in files/ and use  local: \"name.pdf\"  instead.\n"
    );
    delete item.link;
  }
  if (item.local) {
    if (!existsSync(filesDir + item.local)) {
      console.warn("  ! " + item.title + ': files/' + item.local + " not found — skipped.\n");
      delete item.local;
    } else {
      localFileCount++;
    }
  }
}

/* ---- 4. Page shell --------------------------------------- */

const css = read("style.css").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();

const SPECULATION = `<script type="speculationrules">
{"prerender":[{"where":{"selector_matches":"nav a, .entries a[href$='.html'], .backlink"},"eagerness":"moderate"}]}
</script>`;

const runtime = (swPath) => `<script>
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
      document.querySelectorAll('nav a, .entries a[href$=".html"]').forEach(function(a){ warm(a.href); });
    });
    if("serviceWorker" in navigator) navigator.serviceWorker.register("${swPath}").catch(function(){});
  });
})();
</script>`;

function shell({ title, desc, cls, body, prefix, current, swPath }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<style>${css}</style>
${SPECULATION}
</head>
<body>
<div class="page${cls ? " " + cls : ""}">
  <header class="masthead">
    <h1>${esc(SITE.name)}</h1>
    <p class="tagline">${esc(SITE.tagline)}</p>
  </header>
  <nav>${navFor(current, prefix)}</nav>
${body}
</div>
${runtime(swPath)}
</body>
</html>
`;
}

/* ---- 5. Lists -------------------------------------------- */

function listFor(items) {
  if (!items || !items.length) return "<p>Nothing here yet.</p>";
  return (
    '<ul class="entries">' +
    items
      .map((it) => {
        let title = esc(it.title);
        if (it._href && READER) {
          // hosted locally — open in the site's reader
          title = `<a href="${it._href}">${title}</a>`;
        } else if (it.local && READER) {
          // private copy on this machine — served by the local build
          title = `<a href="files/${encodeURIComponent(it.local)}" data-ext>${title}</a>`;
        } else if (it.link) {
          // lives elsewhere — go straight there
          title = `<a href="${esc(it.link)}" data-ext rel="noopener">${title}</a>`;
        }
        const meta = [it.meta, it._src ? readingTime(it._src) + " min read" : null]
          .filter(Boolean)
          .join(" · ");
        return (
          `<li${it.done ? ' class="done"' : ""}>` +
          `<div class="entry-title">${title}</div>` +
          (meta ? `<div class="entry-meta">${esc(meta)}</div>` : "") +
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

const built = [];
const write = (rel, html) => {
  const dest = OUT + rel;
  mkdirSync(dest.slice(0, dest.lastIndexOf("/")), { recursive: true });
  writeFileSync(dest, html);
  built.push([rel, Buffer.byteLength(html)]);
};

const PAGES = [
  { file: "index.html", label: "Home", body: HOME_BODY },
  { file: "movies.html", label: "Movies to Watch", items: MOVIES },
  { file: "essays.html", label: "Essays to Read", items: ESSAYS },
  { file: "books.html", label: "Books to Read", items: BOOKS },
];

for (const p of PAGES) {
  const body = p.items ? `\n  <h2>${esc(p.label)}</h2>\n  ${listFor(p.items)}` : p.body;
  write(
    p.file,
    shell({
      title: p.file === "index.html" ? SITE.name : p.label + " — " + SITE.name,
      desc: SITE.tagline,
      body: body + `\n\n  <footer>Edit <code>data.js</code>, then run <code>node build.mjs</code>.</footer>`,
      prefix: "",
      current: p.file,
      swPath: "sw.js",
    })
  );
}

/* ---- 6. Reader pages ------------------------------------- */

const readDir = OUT + "read/";
if (existsSync(readDir)) rmSync(readDir, { recursive: true });
if (READER) mkdirSync(readDir, { recursive: true });

const readerPages = [];
for (const e of ESSAYS) {
  if (!e._src || !READER) continue;

  const byline = [
    e.meta ? esc(e.meta) : null,
    readingTime(e._src) + " min read",
    e.link ? `<a href="${esc(e.link)}" rel="noopener">original</a>` : null,
  ]
    .filter(Boolean)
    .join(" &middot; ");

  const body = `
  <div class="progress" aria-hidden="true"></div>
  <a class="backlink" href="../essays.html">&larr; Essays</a>
  <article>
    <div class="essay-head">
      <h1 class="essay-title">${esc(e.title)}</h1>
      <p class="byline">${byline}</p>
    </div>
    <div class="essay-body">
${markdown(e._src)}
    </div>
  </article>

  <footer><a href="../essays.html">Back to the list</a></footer>`;

  write(
    "read/" + e._slug + ".html",
    shell({
      title: e.title + " — " + SITE.name,
      desc: e.meta || SITE.tagline,
      cls: "reader",
      body,
      prefix: "../",
      current: "essays.html",
      swPath: "../sw.js",
    })
  );
  readerPages.push("read/" + e._slug + ".html");
}

/* ---- 6b. Copy private files into the local build ---------- */

if (READER && existsSync(filesDir)) {
  cpSync(filesDir, OUT + "files/", { recursive: true });
}

/* ---- 7. Service worker ----------------------------------- */

const assets = [...PAGES.map((p) => p.file), ...readerPages, "./"];
const version = createHash("sha1").update(built.map((b) => b[1]).join() + css).digest("hex").slice(0, 8);

writeFileSync(
  OUT + "sw.js",
  `/* generated by build.mjs — do not edit */
const V = "site-${version}";
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then((c) => c.addAll(ASSETS).catch(() => {})));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) =>
    Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))
  ).then(() => self.clients.claim()));
});
// Network-first, cache as fallback: fast, offline-capable, and never
// serves you a stale page after a push.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(V).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || Response.error()))
  );
});
`
);

/* ---- 8. Report ------------------------------------------- */

console.log("\n  built " + built.length + " pages  (sw " + version + ")\n");
for (const [f, n] of built) console.log("    " + f.padEnd(34) + (n / 1024).toFixed(1) + " KB");
if (READER) {
  console.log("\n    " + readerPages.length + " essay(s) in the reader, " +
              localFileCount + " local file(s)  ->  local/  (never committed)\n");
} else {
  console.log("\n    public build: every essay links to its original source");
  const held = ESSAYS.filter((e) => e.file).length;
  if (held) console.log("    " + held + " local text(s) held back — run  node build.mjs --reader  to read them\n");
  else console.log("");
}
