const state = { lang: "pt" };

const i18n = {
  pt: {
    title: "Encontre o título que você procura.",
    subtitle: "O BookScope pesquisa várias fontes e mostra somente resultados com uma página acessível.",
    placeholder: "Digite o título exato do livro...",
    search: "Pesquisar",
    source: "Fonte",
    all: "Todas",
    limit: "Resultados",
    sourcesTitle: "Fontes pesquisadas",
    sourcesText: "O BookScope é um índice: ele pesquisa metadados e encaminha você para a página da fonte original.",
    footer: "Pesquisa e descoberta de livros.",
    searching: "Pesquisando...",
    empty: "Nenhuma edição disponível encontrada para esse título.",
    error: "Algumas fontes não responderam; os resultados disponíveis foram mantidos.",
    open: "Abrir fonte"
  },
  en: {
    title: "Find the title you are looking for.",
    subtitle: "BookScope searches multiple sources and shows only results with an accessible source page.",
    placeholder: "Enter the exact book title...",
    search: "Search",
    source: "Source",
    all: "All",
    limit: "Results",
    sourcesTitle: "Sources searched",
    sourcesText: "BookScope is an index: it searches metadata and sends you to the original source page.",
    footer: "Book discovery and search.",
    searching: "Searching...",
    empty: "No available edition was found for this title.",
    error: "Some sources did not respond; available results were kept.",
    open: "Open source"
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

function normalizeTitle(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function exactTitleMatch(resultTitle, requestedTitle) {
  return normalizeTitle(resultTitle) === normalizeTitle(requestedTitle);
}

async function openLibrary(title, limit) {
  const fields = "key,title,author_name,first_publish_year,has_fulltext,availability,ia";
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&fields=${fields}&limit=${Math.min(limit, 50)}&lang=${state.lang}`;
  const data = await getJson(url);

  return (data.docs || [])
    .filter(x => exactTitleMatch(x.title || "", title))
    .filter(x => x.key && (x.has_fulltext === true || x.availability?.status === "open"))
    .map(x => ({
      title: x.title,
      authors: x.author_name || [],
      year: x.first_publish_year || "",
      source: "Open Library",
      url: `https://openlibrary.org${x.key}`
    }))
    .slice(0, limit);
}

async function googleBooks(title, limit) {
  const lang = state.lang === "pt" || state.lang === "en" ? `&langRestrict=${state.lang}` : "";
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`intitle:${title}`)}&maxResults=${Math.min(limit, 40)}&printType=books${lang}`;
  const data = await getJson(url);

  return (data.items || [])
    .filter(x => exactTitleMatch(x.volumeInfo?.title || "", title))
    .filter(x => x.accessInfo?.viewability === "ALL_PAGES" || x.accessInfo?.embeddable === true)
    .map(x => ({
      title: x.volumeInfo.title,
      authors: x.volumeInfo.authors || [],
      year: (x.volumeInfo.publishedDate || "").slice(0, 4),
      source: "Google Books",
      url: x.volumeInfo?.infoLink || `https://books.google.com/books?id=${x.id}`
    }))
    .filter(x => /^https?:\/\//.test(x.url))
    .slice(0, limit);
}

async function archive(title, limit) {
  const q = `title:"${title.replace(/"/g, "\\\"")}" AND mediatype:texts`;
  const params = new URLSearchParams({
    q,
    rows: String(Math.min(limit, 20)),
    output: "json",
    fl: ["identifier", "title", "creator", "year"].join(",")
  });
  const data = await getJson(`https://archive.org/advancedsearch.php?${params}`);

  return (data.response?.docs || [])
    .filter(x => exactTitleMatch(x.title || "", title))
    .filter(x => x.identifier)
    .map(x => ({
      title: x.title,
      authors: Array.isArray(x.creator) ? x.creator : (x.creator ? [x.creator] : []),
      year: x.year || "",
      source: "Internet Archive",
      url: `https://archive.org/details/${encodeURIComponent(x.identifier)}`
    }))
    .slice(0, limit);
}

// Open/free-text collections that can be searched directly by title.
async function gutendex(title, limit) {
  const data = await getJson(`https://gutendex.com/books/?search=${encodeURIComponent(title)}`);
  return (data.results || [])
    .filter(x => exactTitleMatch(x.title || "", title))
    .filter(x => x.formats && Object.keys(x.formats).some(k => k.includes("text/html") || k.includes("application/epub")))
    .map(x => ({
      title: x.title,
      authors: (x.authors || []).map(a => a.name),
      year: "",
      source: "Project Gutenberg",
      url: x.formats?.["text/html"] || x.formats?.["application/epub+zip"]
    }))
    .filter(x => x.url)
    .slice(0, limit);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(x => {
    const key = `${normalizeTitle(x.title)}|${normalizeTitle(x.authors.join(" "))}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function render(items) {
  const box = $("#results");
  box.innerHTML = "";
  if (!items.length) {
    $("#status").textContent = text("empty");
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    const h3 = document.createElement("h3");
    h3.textContent = item.title;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${item.authors.length ? item.authors.join(", ") : ""}${item.year ? ` · ${item.year}` : ""} · ${item.source}`;
    const a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = text("open");
    card.append(h3, meta, a);
    box.append(card);
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
  if (source === "all" || source === "gutenberg") jobs.push(gutendex(query, limit));

  const settled = await Promise.allSettled(jobs);
  const results = settled.filter(x => x.status === "fulfilled").flatMap(x => x.value);
  render(dedupe(results));
  if (settled.some(x => x.status === "rejected") && results.length) {
    $("#status").textContent += ` ${text("error")}`;
  }
}

$("#searchForm").addEventListener("submit", e => { e.preventDefault(); search(); });
document.querySelectorAll("[data-lang]").forEach(btn => btn.addEventListener("click", () => {
  state.lang = btn.dataset.lang;
  applyLanguage();
}));
applyLanguage();
