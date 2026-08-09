/* A very small Markdown subset — no dependencies.
   Supports: # headings, paragraphs, *em*, **strong**, [links](url),
   > blockquotes, - lists, 1. lists, --- rules, `code`, footnote-ish
   line breaks. Enough for essays and notes. */

const esc = (s) =>
  s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    .replace(/ -- /g, " &mdash; ");
}

export function markdown(src) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let para = [];
  let list = null; // 'ul' | 'ol'
  let quote = [];

  const flushPara = () => {
    if (para.length) {
      out.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push("</" + list + ">");
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      out.push("<blockquote>" + markdown(quote.join("\n")) + "</blockquote>");
      quote = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^\s*$/.test(line)) {
      flushAll();
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushPara();
      flushList();
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }
    flushQuote();

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flushAll();
      out.push("<hr>");
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushAll();
      const n = Math.min(h[1].length + 1, 5); // # -> h2, so the page h1 stays unique
      out.push(`<h${n}>${inline(h[2])}</h${n}>`);
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const want = ul ? "ul" : "ol";
      if (list !== want) {
        flushList();
        out.push("<" + want + ">");
        list = want;
      }
      out.push("<li>" + inline((ul || ol)[1]) + "</li>");
      continue;
    }
    flushList();

    para.push(line);
  }
  flushAll();
  return out.join("\n");
}

/* Rough reading time, shown in the reader header. */
export function readingTime(src) {
  const words = src.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
