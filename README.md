# CineSearch Pro
An asynchronous movie search application leveraging **The Movie Database (TMDB) API**. This project usesDOM manipulation, state management, and API integration.

## Core Features
* **Asynchronous Search**: Real-time movie searching with a built-in **debouncer** to limit API rate-limits.
* **Dynamic Sidebar**: Renders search results using `DocumentFragment` and HTML templates.
* **Detailed Inspection**: Overlays a detail panel including backdrops, posters, cast grids, and embedded YouTube trailers.
* **Caching**: Implements a `Map` object to store and reuse previous API responses, reducing redundant network requests.
* **Keyboard Navigation**: Navigating results with `↑`/`↓` arrows and selecting with `Enter`.

## Technical Concepts Applied
* **Asynchronous Programming**: Utilizing `async/await` and the `Fetch API` for non-blocking data retrieval.
* **AbortController**: Automatically cancels pending fetch requests if a new search is initiated, preventing race conditions.
* **XSS Protection**: `textContent` and `createTextNode` for rendering API data to prevent malicious script injection.
* **Data Attributes**: Reading and setting `data-idx` through the DOM to track active state and selection.
* **Template Literals & Fragments**: Using `<template>` tags and `DocumentFragment` to batch DOM updates for better performance.

## Some concepts that clicked:
- Using Asynchronous Functions for rendering and fetching
- Knowing when to sanitize user input (via `textContent`) to mitigate XSS attacks
- Using Debounce and caching to reduce API calls

## Some challenges faced:
- Designing CSS styling and basic HTML structure
- Rendering the API details
  - Template Driven Rendering and Fragments
- Implementing keyboard navigation


---
### Credits
- **Data Source**: [The Movie Database (TMDB)](https://www.themoviedb.org/)
