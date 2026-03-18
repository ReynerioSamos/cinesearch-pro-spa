// app.js
import config from "./config.js";
console.log(config.API_KEY);

// State
let activeIndex = -1;
let selectedMovie = null;
const cache = new Map();

// Dom Refs

// Rendering

// Search Logic
// Include XSS Protections later
let debouncerTimer = null;
let controller = null;

// Keyboard navigation
