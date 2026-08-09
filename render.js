/* Shared rendering — you shouldn't need to edit this file. */

(function () {
  var PAGES = [
    { href: "index.html", label: "Home" },
    { href: "movies.html", label: "Movies to Watch" },
    { href: "essays.html", label: "Essays to Read" },
    { href: "books.html", label: "Books to Read" },
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  window.buildChrome = function (currentFile) {
    var host = document.getElementById("chrome");
    if (!host) return;
    var links = PAGES.map(function (p) {
      var cls = p.href === currentFile ? ' class="current"' : "";
      return '<a href="' + p.href + '"' + cls + ">" + esc(p.label) + "</a>";
    }).join("");
    host.innerHTML =
      '<header class="masthead"><h1>' + esc(SITE.name) + "</h1>" +
      '<p class="tagline">' + esc(SITE.tagline) + "</p></header>" +
      "<nav>" + links + "</nav>";
    document.title = SITE.name;
  };

  window.renderList = function (items, targetId) {
    var host = document.getElementById(targetId);
    if (!host) return;
    if (!items || !items.length) {
      host.innerHTML = "<p>Nothing here yet.</p>";
      return;
    }
    host.innerHTML = items.map(function (it) {
      var title = it.link
        ? '<a href="' + esc(it.link) + '">' + esc(it.title) + "</a>"
        : esc(it.title);
      return (
        '<li class="' + (it.done ? "done" : "") + '">' +
        '<div class="entry-title">' + title + "</div>" +
        (it.meta ? '<div class="entry-meta">' + esc(it.meta) + "</div>" : "") +
        (it.note ? '<div class="entry-note">' + esc(it.note) + "</div>" : "") +
        "</li>"
      );
    }).join("");
  };

  window.renderFooter = function () {
    var host = document.getElementById("foot");
    if (host) {
      host.innerHTML = "Add or edit entries in <code>data.js</code>.";
    }
  };
})();
