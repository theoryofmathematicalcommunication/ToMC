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
