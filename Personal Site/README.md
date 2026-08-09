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

---

## Putting it on GitHub Pages

### One-time setup

1. Create a new repository on GitHub. Two options for the URL:
   - Name it `yourusername.github.io` → site lives at `https://yourusername.github.io/`
   - Name it anything else, e.g. `site` → site lives at `https://yourusername.github.io/site/`
2. Upload every file **at the top level of the repository**, not inside a
   subfolder. `index.html` must sit in the repo root, otherwise GitHub Pages
   will show a 404.
3. Go to **Settings → Pages**. Under "Build and deployment", set
   **Source = Deploy from a branch**, **Branch = `main`**, **Folder = `/ (root)`**,
   and click Save.
4. Wait ~1 minute, then reload your Pages URL. Every push to `main` redeploys
   automatically.

### Uploading through the browser (no git needed)

On the repo page: **Add file → Upload files**, drag in all the files, write a
short message, then **Commit changes**. That's a deploy.

### Uploading with git

```bash
git clone https://github.com/yourusername/yourrepo.git
cd yourrepo
# copy the site files in here
git add .
git commit -m "Update lists"
git push
```

---

## Rules for adding files so nothing breaks

- **Keep `index.html` in the repo root.** GitHub Pages serves that as the home page.
- **Use relative links only** — `movies.html`, `style.css`, `images/poster.jpg`.
  Never start a path with `/` (that breaks on project repos served from a
  subfolder like `/site/`).
- **Filenames: lowercase, no spaces.** Use hyphens: `book-notes.html`, not
  `Book Notes.html`. GitHub Pages is case-sensitive — `Style.css` will not
  match `style.css`.
- **Don't delete `.nojekyll`.** Without it GitHub runs Jekyll, which ignores
  any file or folder starting with `_` or `.`.
- **Images and PDFs** go in an `images/` or `files/` folder in the repo root,
  and are linked as `images/whatever.jpg`.
- Changes can take up to a minute to appear. If you see the old version,
  hard-refresh (Cmd/Ctrl + Shift + R).

---

## Adding an entry to a list

Open `data.js` and add a line to the relevant array. Only `title` is required;
delete any field you don't want.

```js
const MOVIES = [
  { title: "Stalker", meta: "Tarkovsky, 1979", note: "Finally making time." },
  { title: "Nosferatu", meta: "Eggers, 2024" },   // <- new line
];
```

Fields:

| Field   | Meaning                                                   |
|---------|-----------------------------------------------------------|
| `title` | Required. The name of the film / essay / book.             |
| `meta`  | Director + year, author, publication — the small grey line. |
| `note`  | A sentence to yourself.                                    |
| `link`  | A URL; makes the title clickable. Useful for essays.       |
| `done`  | `true` crosses the item out instead of removing it.        |

Watch the punctuation: every entry is wrapped in `{ }`, and every entry except
the last needs a trailing comma. If a page suddenly shows nothing, that's
almost always a missing comma or quote in `data.js`.

Your name and tagline live at the top of the same file:

```js
const SITE = {
  name: "Your Name",
  tagline: "Notes, lists, and things worth getting to.",
};
```

## Adding a whole new tab

1. Copy `books.html` to e.g. `albums.html`.
2. In the copy, change the `<title>`, the `<h2>` heading, and the two lines at
   the bottom to `buildChrome("albums.html")` and `renderList(ALBUMS, "list")`.
3. In `data.js`, add `const ALBUMS = [ ... ];`.
4. In `render.js`, add `{ href: "albums.html", label: "Albums" },` to the
   `PAGES` array so it appears in the nav on every page.

## Previewing locally

```bash
cd path/to/site
python3 -m http.server 8000
# open http://localhost:8000
```

Opening the HTML files directly with `file://` also works here, since there's
no fetching involved.
