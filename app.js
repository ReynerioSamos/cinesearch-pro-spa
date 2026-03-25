// app.js
import config from "./config.js";
import { dummySearchResults, dummyMovieDetails } from "./dummy.js";

// Flag to use dummy data -- will be removed when the page is being served
const USE_DUMMY = false;

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
const searchWrap = searchInput.closest("[data-loading]");
const statusBar = document.getElementById("status-bar");
const resultList = document.getElementById("result-list");
const resultsHeader = document.getElementById("results-header");
const detailEmpty = document.getElementById("detail-empty");
const detailContent = document.getElementById("detail-content");
const template = document.getElementById("result-template");

// Detail panel slots — populated in-place, never replaced
// was better than the method I had to dynamically build everytime on render
const detailBackdropWrap = document.getElementById("detail-backdrop-wrap");
const detailPosterWrap = document.getElementById("detail-poster-wrap");
const detailTitle = document.getElementById("detail-title");
const detailTagline = document.getElementById("detail-tagline");
const detailBadges = document.getElementById("detail-badges");
const detailOverview = document.getElementById("detail-overview");
const detailCast = document.getElementById("detail-cast");
const detailTrailer = document.getElementById("detail-trailer");

//API
async function fetchJSON(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.set("api_key", config.API_KEY);
    url.searchParams.set("language", "en-US");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const cacheKey = url.toString();
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const res = await fetch(url);
    // Error checking for API response, if not ok, throw an error in console
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    // store response in cache, used for repeated requests to save API calls
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
    // flag needed as MovieDB recently started serving aduly movies so an explicit flag is needed to filter out
    return fetchJSON("/search/movie", { query, include_adult: false });
}

async function fetchMovieDetails(id) {
    if (USE_DUMMY) {
        return dummyMovieDetails[id] ?? dummyMovieDetails[1];
    }
    // append_to_response bundles credits and videos into one request
    return fetchJSON(`/movie/${id}`, {
        append_to_response: "credits,videos",
    });
}

// Rendering -- Highlight matched query text
function buildHighlightedTitle(title, query) {
    const container = document.createElement("span");
    if (!query) {
        container.textContent = title;
        return container;
    }
    const idx = title.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) {
        container.textContent = title;
        return container;
    }
    container.appendChild(document.createTextNode(title.slice(0, idx)));
    const mark = document.createElement("span");
    mark.className = "highlight";
    mark.textContent = title.slice(idx, idx + query.length);
    container.appendChild(mark);
    container.appendChild(
        document.createTextNode(title.slice(idx + query.length)),
    );
    return container;
}

// Rendering -- Sidebar Results --
// uses fragments to render results efficiently
function renderResults(movies, query) {
    const frag = new DocumentFragment();

    movies.forEach((movie, i) => {
        const clone = template.content.cloneNode(true);
        const item = clone.querySelector(".result-item");
        const titleEl = clone.querySelector(".result-title");
        const meta = clone.querySelector(".result-meta");
        const rating = clone.querySelector(".result-rating");

        titleEl.appendChild(buildHighlightedTitle(movie.title, query));

        const year = movie.release_date?.slice(0, 4) ?? "—";
        const genres = movie.genre_ids?.length ? "" : ""; // genre names need a lookup — just show year for now
        meta.textContent = year;
        rating.textContent = `★ ${movie.vote_average?.toFixed(1) ?? "—"}`;

        item.dataset.idx = i;
        item.addEventListener("click", () => selectMovie(i));
        item.addEventListener("keydown", (e) => {
            if (e.key === "Enter") selectMovie(i);
        });

        frag.appendChild(clone);
    });

    resultList.innerHTML = "";
    resultList.appendChild(frag);
    resultsHeader.textContent = `${movies.length} RESULT${movies.length !== 1 ? "S" : ""}`;
    statusBar.textContent = `${movies.length} RESULT${movies.length !== 1 ? "S" : ""}`;
}

// Rendering -- Active State
// new state implemented to highlight the currently selected result (if a response is given from API/dummy data)
function setActiveResult(idx) {
    activeIndex = idx;
    document.querySelectorAll(".result-item").forEach((el, i) => {
        el.classList.toggle("active", i == idx);
    });

    // Scroll active result into view
    const activeEl = resultList.querySelector(`[data-idx="${idx}"]`);
    if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

// Rendering -- Details --
// Overhauled making use of fragments and template literals
async function renderDetail(movie) {
    detailEmpty.style.display = "none";
    detailContent.classList.remove("visible");
    void detailContent.offsetWidth;
    detailContent.classList.add("visible");

    // Clear slots while loading
    detailBackdropWrap.innerHTML = "";
    detailPosterWrap.innerHTML = "";
    detailTitle.textContent = "Loading…";
    detailTagline.textContent = "";
    detailBadges.innerHTML = "";
    detailOverview.textContent = "";
    detailCast.innerHTML = "";
    detailTrailer.innerHTML = "";

    const data = await fetchMovieDetails(movie.id);

    if (data.backdrop_path) {
        const img = document.createElement("img");
        img.className = "detail-backdrop";
        img.src = `${IMG_BASE}/w1280${data.backdrop_path}`;
        img.alt = "";
        detailBackdropWrap.appendChild(img);
    } else {
        const ph = document.createElement("div");
        ph.className = "detail-backdrop-placeholder";
        ph.textContent = "🎬";
        detailBackdropWrap.appendChild(ph);
    }

    // Poser
    if (data.poster_path) {
        const img = document.createElement("img");
        img.className = "detail-poster";
        img.src = `${IMG_BASE}/w342${data.poster_path}`;
        img.alt = data.title;
        detailPosterWrap.appendChild(img);
    } else {
        const ph = document.createElement("div");
        ph.className = "detail-poster-placeholder";
        ph.textContent = "🎬";
        detailPosterWrap.appendChild(ph);
    }

    // Title and Tagline
    detailTitle.textContent = data.title;
    detailTagline.textContent = data.tagline ?? "";

    // Badges
    // Year badge
    detailBadges.innerHTML = "";
    const year = data.release_date?.slice(0, 4);
    if (year) {
        const yb = document.createElement("span");
        yb.className = "badge accent";
        yb.textContent = year;
        detailBadges.appendChild(yb);
    }

    // Rating badge
    const rb = document.createElement("span");
    rb.className = "badge accent";
    rb.textContent = `★ ${data.vote_average?.toFixed(1) ?? "—"}`;
    detailBadges.appendChild(rb);

    // Runtime badge
    if (data.runtime) {
        const rtb = document.createElement("span");
        rtb.className = "badge";
        rtb.textContent = `${data.runtime} min`;
        detailBadges.appendChild(rtb);
    }

    // Genre badge
    (data.genres ?? []).forEach((g) => {
        const b = document.createElement("span");
        b.className = "badge";
        b.textContent = g.name;
        detailBadges.appendChild(b);
    });

    // Overview
    detailOverview.textContent = data.overview || "No overview available.";

    // Cast
    const cast = data.credits?.cast?.slice(0, 8) ?? [];
    const castFrag = new DocumentFragment();
    cast.forEach((member) => {
        const item = document.createElement("div");
        item.className = "cast-item";

        //used to get img of cast to use in avatar bubble
        const avatar = document.createElement("div");
        avatar.className = "cast-avatar";
        if (member.profile_path) {
            const img = document.createElement("img");
            img.src = `${IMG_BASE}/w185${member.profile_path}`;
            img.alt = member.name;
            avatar.appendChild(img);
        } else {
            avatar.textContent = member.name[0];
        }

        // Cast Name
        const name = document.createElement("div");
        name.className = "cast-name";
        name.textContent = member.name;

        // Cast Character
        const char = document.createElement("div");
        char.className = "cast-char";
        char.textContent = member.character;
        // Append all this info to the Cast object instance
        item.appendChild(avatar);
        item.appendChild(name);
        item.appendChild(char);
        castFrag.appendChild(item);
    });
    detailCast.appendChild(castFrag);

    // Trailer
    const trailer = data.videos?.results?.find(
        (v) => v.site === "YouTube" && v.type === "Trailer",
    );

    if (trailer) {
        const wrap = document.createElement("div");
        wrap.className = "trailer-wrap";
        const iframe = document.createElement("iframe");
        // gets the trailer from youtube
        iframe.src = `https://www.youtube.com/embed/${trailer.key}`;
        iframe.title = trailer.name;
        iframe.allow =
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        wrap.appendChild(iframe);
        detailTrailer.appendChild(wrap);
    } else {
        // Fallback if no trailer found (Usually Older or Independent Films)
        const msg = document.createElement("p");
        msg.className = "trailer-failed";
        msg.textContent = "No trailer available.";
        detailTrailer.appendChild(msg);
    }
}

// Selection
function selectMovie(idx) {
    const movie = results[idx];
    // If no movie selected, state remains as inactive and nothing rendered
    // Only renders information is movie is selected
    if (!movie) return;
    setActiveResult(idx);
    selectedMovie = movie;
    renderDetail(movie);
}

// Search Logic
// Debounces search input and handles search requests
// Prevents requests from being sent on every new char
let debouncerTimer = null;
let controller = null;

async function handleSearch(query) {
    query = query.trim();

    if (!query) {
        resultList.innerHTML = "";
        resultsHeader.textContent = "RESULTS";
        statusBar.textContent = "READY";
        results = [];
        activeIndex = -1;
        detailEmpty.style.display = "";
        detailContent.classList.remove("visible");
        return;
    }

    controller?.abort();
    controller = new AbortController();
    searchWrap.dataset.loading = "true";
    statusBar.textContent = "FETCHING…";

    try {
        const data = await searchMovies(query);
        results = data.results ?? [];
        renderResults(results, query);
        if (results.length) selectMovie(0);
    } catch (err) {
        if (err.name !== "AbortError") {
            statusBar.textContent = "ERROR";
            console.error(err);
        }
    } finally {
        searchWrap.dataset.loading = "false";
    }
}

//adds the debounce on input of the search bar
searchInput.addEventListener("input", (e) => {
    clearTimeout(debouncerTimer);
    debouncerTimer = setTimeout(() => handleSearch(e.target.value), 300);
});
// Keyboard navigation
document.addEventListener("keydown", (e) => {
    if (!results.length) return;

    //keyboard navigation for escape to cancel search (stops app from auto-creating API call if search is aborted)
    if (e.key === "Escape") {
        searchInput.value = "";
        handleSearch("");
        return;
    }

    // keyboard navigation using up/down/enter on sidebar
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
        return;
    }
});
//Init
statusBar.textContent = "READY";
