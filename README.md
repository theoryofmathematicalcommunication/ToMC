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
