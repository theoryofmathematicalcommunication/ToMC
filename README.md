# Personal site

A plain static site — no build step, no dependencies. Four pages (Home, Movies
to Watch, Essays to Read, Books to Read) that all read their content from a
single file, `data.js`.

## Files

```
index.html     Home page
movies.html    Movies to Watch
essays.html    Essays to Read
books.html     Books to Read
data.js        <- the only file you normally edit
render.js      Shared nav + list rendering (leave alone)
style.css      Colors and type (Cambridge philosophy green)
.nojekyll      Tells GitHub Pages to serve files as-is
README.md      This file
```

Fields:

| Field   | Meaning                                                     |
| ------- | ----------------------------------------------------------- |
| `title` | Required. The name of the film / essay / book.              |
| `meta`  | Director + year, author, publication — the small grey line. |
| `note`  | A sentence to yourself.                                     |
| `link`  | A URL; makes the title clickable. Useful for essays.        |
| `done`  | `true` crosses the item out instead of removing it.         |

## Adding a whole new tab

1. Copy `books.html` to e.g. `albums.html`.
2. In the copy, change the `<title>`, the `<h2>` heading, and the two lines at
   the bottom to `buildChrome("albums.html")` and `renderList(ALBUMS, "list")`.
3. In `data.js`, add `const ALBUMS = [ ... ];`.
4. In `render.js`, add `{ href: "albums.html", label: "Albums" },` to the
   `PAGES` array so it appears in the nav on every page.

---

## Building (new)

The HTML files are now **generated**. You still only edit `data.js`; the build
writes the finished pages with the lists already in them.

```bash
node build.mjs      # regenerates the 4 pages + sw.js
```

Run it before every commit. If `data.js` has a typo the build refuses to write
anything and tells you the line — so a missing comma can no longer reach the
live site.

Don't hand-edit `index.html`, `movies.html`, `essays.html`, `books.html`, or
`sw.js`; they're overwritten. Edit `data.js` (content), `style.css` (looks), or
`build.mjs` (page structure).

### Why it's faster

| Technique | Effect |
|---|---|
| Lists pre-rendered into HTML | Text appears on first paint; no JS needed to see content |
| CSS inlined into `<head>` | No render-blocking stylesheet request |
| `data.js` / `render.js` no longer fetched | 4 requests down to 1 |
| Speculation rules | Chrome pre-renders a page while you hover the link |
| `rel=prefetch` fallback | Same warming for other browsers |
| Service worker | Repeat visits and back/forward are cache-instant, and work offline |

### Adding a new tab now

1. In `data.js`, add `const ALBUMS = [ ... ];`
2. In `build.mjs`, destructure `ALBUMS` from `ctx` and add one line to `PAGES`:
   `{ file: "albums.html", label: "Albums", items: ALBUMS },`
3. `node build.mjs` — the page and every nav bar update themselves.

---

## The reader

Essays can be read inside the site instead of linking out — but only for
texts you're entitled to host, and only in the private build.

### Two build modes

```bash
node build.mjs            # PUBLIC  -> repo root. Every essay links out.
node build.mjs --reader   # PRIVATE -> local/. Includes the in-site reader.
```

The public build is the default, so the safe thing happens even if you forget
which mode you last ran. `local/` and `essays/` are in `.gitignore` and cannot
be pushed by accident.

Read privately with:

```bash
node build.mjs --reader && cd local && python3 -m http.server 8000
```

### Adding a readable essay

1. Write or save the text as Markdown in `essays/`, e.g. `essays/my-piece.md`.
2. Point at it from `data.js` with a `file:` field:

```js
{ title: "Notes on Dark City", meta: "Axel Tamir", file: "notes-on-dark-city.md" },
```

Both `file` and `link` can be present: the reader page then shows an
"original" link in the byline.

Markdown supported: `#` headings, paragraphs, `**bold**`, `*italic*`,
`[links](url)`, `>` blockquotes, `-` and `1.` lists, `---` rules, `` `code` ``.

### What goes where

| Field | Behaviour on the essays list |
|---|---|
| `link:` only | Links straight to the original, marked with ↗ |
| `file:` only | Public build: plain text. Reader build: opens in the reader |
| both | Same, plus an "original" link inside the reader |

### Reader optimizations

Reader pages get the same treatment as the rest of the site: text baked into
the HTML, CSS inlined, no runtime JS to display anything, hover prerendering,
and service-worker caching so a piece you have opened is readable offline. The
reading-progress bar uses a CSS scroll-driven animation, so there is no scroll
listener running as you read.

---

## Linking to PDFs and other local files

`file:///Users/you/Downloads/whatever.pdf` will **not** work. Browsers block
navigation from an http(s) page to a `file://` URL, so the link does nothing
when clicked — no error, no tab. The build now detects those and warns you.

Use the `local:` field instead:

1. Put the file in `files/` (gitignored, never pushed).
2. Reference it by filename:

```js
{ title: "Categories and Sheaves", meta: "Kashiwara and Schapira",
  local: "Categories and Sheaves.pdf",
  link: "https://link.springer.com/book/10.1007/3-540-27950-4" },
```

| Build | What the title links to |
|---|---|
| `node build.mjs` (public) | `link:` — the publisher page. `local:` is ignored entirely. |
| `node build.mjs --reader` (private) | `local:` — the PDF, served over http from `local/files/`. |

So the public site sends people to the publisher, while your own copy opens the
file. If a `local:` file is missing the build says so and falls back to `link:`.

Read privately with:

```bash
node build.mjs --reader && cd local && python3 -m http.server 8000
```
