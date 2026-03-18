// app.js
import config from "./config.js";
import { dummySearchResults, dummyMovieDetails } from "./dummy.js";

// Flag to use dummy data -- will be removed when the page is being served
const USE_DUMMY = true;

// Dummy data -- Will be deleted later when the page is being served

// State
let activeIndex = -1;
let results = [];
let selectedMovie = null;
// used later to cahce recently searched movies
const cache = new Map();

// Constants
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

// Dom Refs
const searchInput = document.getElementById("search-input");
const searchWrap = searchInput.closest(".search-wrap");
const statusBar = document.getElementById("status-bar");
const sidebar = document.querySelector(".sidebar");
const main = document.querySelector("main");
const resultsList = document.getElementById("results-list");
const resultsHeader = document.getElementById("result-header");
const resultsCount = document.getElementById("results-count");

//API
async function fetchJSON(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", config.API_KEY);
  url.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const cacheKey = url.toString();
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  cache.set(cacheKey, data);
  return data;
}

async function searchMovies(query) {
  if (USE_DUMMY) {
    const q = query.toLowerCase();
    return {
      results: dummySearchResults.filter((m) =>
        m.title.toLowerCase().includes(q),
      ),
    };
  }
  return fetchJSON("/search/movie", { query, include_adult: false });
}

async function fetchMovieDetails(id) {
  if (USE_DUMMY) {
    return dummyMovieDetails[id] ?? dummyMovieDetails[1];
  }
  // append_to_response bundles credits + videos into one request
  return fetchJSON(`/movie/${id}`, {
    append_to_response: "credits,videos",
  });
}
// Rendering -- Empty State --
function renderEmptyState() {
  main.innerHTML = `
        <div class="detail-empty">
            <span>🎬</span>
            <p>Search for a movie to get started</p>
        </div>
    `;
}

// Rendering -- Sidebar Results --
function renderResults(movies, query) {
  resultsList.innerHTML = ""; // clear previous results

  if (!movies.length) {
    resultsHeader.hidden = true;
    statusBar.textContent = "No results found";
    return;
  }

  // Show results count in both the status bar and sidebar header
  const countText = `${movies.length} result${movies.length !== 1 ? "s" : ""}`;
  statusBar.textContent = countText;
  resultsCount.textContent = countText;
  resultsHeader.hidden = false;

  movies.forEach((movie, i) => {
    const li = document.createElement("li");
    li.className = "result-item";
    li.dataset.index = i;

    const year = movie.release_date?.slice(0, 4) ?? "—";
    const rating = movie.vote_average?.toFixed(1) ?? "—";

    const highlighted = movie.title.replace(
      new RegExp(`(${query})`, "gi"),
      `<span class="highlight">$1</span>`,
    );

    li.innerHTML = `
            ${
              movie.poster_path
                ? `<img class="result-poster"
                            src="${IMG_BASE}/w92${movie.poster_path}"
                            alt="${movie.title}"
                            loading="lazy" />`
                : `<div class="result-poster-placeholder">🎬</div>`
            }
            <div class="result-info">
                <p class="result-title">${highlighted}</p>
                <p class="result-meta">${year}</p>
                <p class="result-rating">⭐ ${rating}</p>
            </div>
        `;

    li.addEventListener("click", () => selectMovie(i));
    resultsList.appendChild(li);
  });
}

// Rendering -- Details --
async function renderDetail(movie) {
  // Show a loading skeleton while fetching full details
  main.innerHTML = `
        <div class="detail-empty">
            <span>⏳</span>
            <p>Loading...</p>
        </div>
    `;

  const data = await fetchMovieDetails(movie.id);

  const year = data.release_date?.slice(0, 4) ?? "—";
  const rating = data.vote_average?.toFixed(1) ?? "—";
  const runtime = data.runtime ? `${data.runtime} min` : "—";
  const genres = data.genres ?? [];
  const cast = data.credits?.cast?.slice(0, 6) ?? [];

  // Pick a YouTube trailer if available
  const trailer = data.videos?.results?.find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );

  // Fallback backdrop color if no backdrop image
  const backdropStyle = data.backdrop_path
    ? `background-image: url(${IMG_BASE}/w1280${data.backdrop_path}); background-size: cover; background-position: center;`
    : `background-color: var(--surface2);`;

  main.className = "detail";
  main.innerHTML = `
        <div class="detail-top">

            <!-- Left Column -->
            <div class="detail-poster">
                <span class="year-badge">${year}</span>
                ${
                  data.poster_path
                    ? `<img class="movie-cover"
                                src="${IMG_BASE}/w300${data.poster_path}"
                                alt="${data.title}" />`
                    : `<div class="movie-cover" style="display:flex;align-items:center;justify-content:center;">🎬</div>`
                }
                <h2 class="movie-title">${data.title}</h2>
                ${data.tagline ? `<p class="movie-tagline">${data.tagline}</p>` : ""}

                <!-- Cast -->
                <div class="cast-grid">
                    ${cast
                      .map(
                        (member) => `
                        <div class="cast-card">
                            ${
                              member.profile_path
                                ? `<img src="${IMG_BASE}/w185${member.profile_path}" alt="${member.name}" loading="lazy" />`
                                : `<div style="aspect-ratio:2/3;background:var(--border);display:flex;align-items:center;justify-content:center;">👤</div>`
                            }
                            <p class="cast-name">${member.name}</p>
                            <p class="cast-character">${member.character}</p>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            </div>

            <!-- Right Column -->
            <div class="backdrop-col">
                <div class="backdrop-wrap" style="${backdropStyle}"></div>

                <div class="meta-bar">
                    <span class="rating">⭐ ${rating} / 10</span>
                    <span class="runtime">🕐 ${runtime}</span>
                </div>

                <div class="tags">
                    ${genres.map((g) => `<span class="tag">${g.name}</span>`).join("")}
                </div>

                <div class="synopsis">${data.overview || "No synopsis available."}</div>

                ${
                  trailer
                    ? `<div class="trailer">
                                <iframe
                                    src="https://www.youtube.com/embed/${trailer.key}"
                                    title="${trailer.name}"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                           </div>`
                    : ""
                }
            </div>
        </div>
    `;
}

// Selection
function selectMovie(index) {
  activeIndex = index;
  selectedMovie = results[index];

  // Update active class on result items
  document.querySelectorAll(".result-item").forEach((el, i) => {
    el.classList.toggle("active", i === index);
  });

  renderDetail(selectedMovie);
}

// Search Logic
let debouncerTimer = null;
let controller = null;

async function handleSearch(query) {
  query = query.trim();

  if (!query) {
    statusBar.textContent = "";
    resultsList.innerHTML = "";
    resultsHeader.hidden = true;
    results = [];
    activeIndex = -1;
    renderEmptyState();
    return;
  }

  // Cancel any in-flight request
  controller?.abort();
  controller = new AbortController();

  searchWrap.dataset.loading = "true";

  try {
    const data = await searchMovies(query);
    results = data.results ?? [];
    renderResults(results, query);

    // Auto-select first result
    if (results.length) selectMovie(0);
    else renderEmptyState();
  } catch (err) {
    if (err.name !== "AbortError") {
      statusBar.textContent = "Something went wrong.";
      console.error(err);
    }
  } finally {
    searchWrap.dataset.loading = "false";
  }
}

searchInput.addEventListener("input", (e) => {
  clearTimeout(debouncerTimer);
  debouncerTimer = setTimeout(() => handleSearch(e.target.value), 300);
});
// Include XSS Protections later
// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (!results.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectMovie(Math.min(activeIndex + 1, results.length - 1));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectMovie(Math.max(activeIndex - 1, 0));
  } else if (e.key === "Enter" && activeIndex >= 0) {
    renderDetail(results[activeIndex]);
  } else if (e.key === "/") {
    e.preventDefault();
    searchInput.focus();
  }
});
//Init
renderEmptyState();
