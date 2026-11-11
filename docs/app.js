const state = { lang: "pt" };

const i18n = {
  pt: {
    title: "Pesquise livros em vários acervos.",
    subtitle: "Uma interface web simples para pesquisar catálogos e arquivos digitais sem instalar o BookScope.",
    placeholder: "Título, autor, ISBN ou assunto...",
    search: "Pesquisar",
    source: "Fonte",
    all: "Todas",
    limit: "Resultados",
    sourcesTitle: "Fontes pesquisadas",
    sourcesText: "O BookScope funciona como um índice: os resultados apontam para a página original da fonte.",
    footer: "Pesquisa e descoberta de livros.",
    searching: "Pesquisando...",
    empty: "Nenhum resultado encontrado.",
    error: "Uma fonte não respondeu. As outras fontes continuam disponíveis."
  },
  en: {
    title: "Search books across multiple collections.",
    subtitle: "A simple web interface for searching catalogs and digital archives without installing BookScope.",
    placeholder: "Title, author, ISBN or subject...",
    search: "Search",
    source: "Source",
    all: "All",
    limit: "Results",
    sourcesTitle: "Sources",
    sourcesText: "BookScope acts as an index: results point to the original source page.",
    footer: "Book discovery and search.",
    searching: "Searching...",
    empty: "No results found.",
    error: "A source did not respond. Other sources remain available."
  }
};

const $ = (s) => document.querySelector(s);

function text(key) { return i18n[state.lang][key] || key; }

function applyLanguage() {
  document.documentElement.lang = state.lang === "pt" ? "pt-BR" : "en";
  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = text(el.dataset.i18n));
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => el.placeholder = text(el.dataset.i18nPlaceholder));
  document.querySelectorAll("[data-lang]").forEach(btn => btn.classList.toggle("active", btn.dataset.lang === state.lang));
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function openLibrary(query, limit) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&lang=${state.lang}`;
  const data = await getJson(url);
  return (data.docs || []).slice(0, limit).map(x => ({
    title: x.title || "Untitled",
    authors: x.author_name || [],
    year: x.first_publish_year || "",
    source: "Open Library",
    url: x.key ? `https://openlibrary.org${x.key}` : "https://openlibrary.org/"
  }));
}

async function googleBooks(query, limit) {
  const lang = state.lang === "pt" || state.lang === "en" ? `&langRestrict=${state.lang}` : "";
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${Math.min(limit,40)}&printType=books${lang}`;
  const data = await getJson(url);
  return (data.items || []).slice(0, limit).map(x => ({
    title: x.volumeInfo?.title || "Untitled",
    authors: x.volumeInfo?.authors || [],
    year: (x.volumeInfo?.publishedDate || "").slice(0,4),
    source: "Google Books",
    url: x.volumeInfo?.infoLink || `https://books.google.com/books?id=${x.id}`
  }));
}

async function archive(query, limit) {
  const q = `(title:(${query}) OR creator:(${query}) OR subject:(${query})) AND mediatype:texts`;
  const params = new URLSearchParams({ q, rows: String(Math.min(limit,50)), output: "json" });
  params.append("fl[]", "identifier"); params.append("fl[]", "title"); params.append("fl[]", "creator"); params.append("fl[]", "year");
  const data = await getJson(`https://archive.org/advancedsearch.php?${params}`);
  return (data.response?.docs || []).slice(0,limit).map(x => ({
    title: x.title || "Untitled",
    authors: Array.isArray(x.creator) ? x.creator : (x.creator ? [x.creator] : []),
    year: x.year || "",
    source: "Internet Archive",
    url: x.identifier ? `https://archive.org/details/${x.identifier}` : "https://archive.org/"
  }));
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(x => {
    const key = `${x.title.toLowerCase()}|${x.authors.join("|").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function render(items) {
  const box = $("#results");
  box.innerHTML = "";
  if (!items.length) { $("#status").textContent = text("empty"); return; }
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    const h3 = document.createElement("h3"); h3.textContent = item.title;
    const meta = document.createElement("div"); meta.className = "meta";
    meta.textContent = `${item.authors.length ? item.authors.join(", ") : "—"}${item.year ? ` · ${item.year}` : ""} · ${item.source}`;
    const a = document.createElement("a"); a.href = item.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = state.lang === "pt" ? "Abrir fonte" : "Open source";
    card.append(h3, meta, a); box.append(card);
  });
}

async function search() {
  const query = $("#query").value.trim();
  if (!query) return;
  const limit = Number($("#limit").value);
  const source = $("#source").value;
  $("#status").textContent = text("searching");
  $("#results").innerHTML = "";

  const jobs = [];
  if (source === "all" || source === "openlibrary") jobs.push(openLibrary(query, limit));
  if (source === "all" || source === "googlebooks") jobs.push(googleBooks(query, limit));
  if (source === "all" || source === "archive") jobs.push(archive(query, limit));

  const settled = await Promise.allSettled(jobs);
  const results = settled.filter(x => x.status === "fulfilled").flatMap(x => x.value);
  render(dedupe(results));
  if (settled.some(x => x.status === "rejected") && results.length) {
    $("#status").textContent += ` ${text("error")}`;
  }
}

$("#searchForm").addEventListener("submit", e => { e.preventDefault(); search(); });
document.querySelectorAll("[data-lang]").forEach(btn => btn.addEventListener("click", () => {
  state.lang = btn.dataset.lang; applyLanguage();
}));
applyLanguage();
