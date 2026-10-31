/**
 * Katselulista – Mobile/iPad Web App Engine
 */

// Initial Seed Data (Empty by default - personal items are stored in Dropbox)
const DEFAULT_ITEMS = [];

// App State
let items = [];
let currentFilter = "all";
let currentPlatform = "all";
let searchQuery = "";
let activeItem = null;

// Storage Keys
const STORAGE_KEY = "katselulista_items_v1";
const DROPBOX_TOKEN_KEY = "katselulista_dropbox_token";

// Elements
const cardsGrid = document.getElementById("cardsGrid");
const searchInput = document.getElementById("searchInput");
const searchClearBtn = document.getElementById("searchClearBtn");
const tabButtons = document.querySelectorAll(".tab-btn");
const chipButtons = document.querySelectorAll(".chip-btn");

// Modals
const detailModal = document.getElementById("detailModal");
const addModal = document.getElementById("addModal");
const syncModal = document.getElementById("syncModal");
const toast = document.getElementById("toast");

// Initialize
function initApp() {
  loadData();
  setupEventListeners();
  renderFilters();
  renderCards();
}

// Load data from localStorage or fallback to defaults
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      items = JSON.parse(saved);
    } else {
      items = [...DEFAULT_ITEMS];
      saveData();
    }
  } catch (e) {
    console.error("Virhe ladattaessa muistista:", e);
    items = [...DEFAULT_ITEMS];
  }
}

// Save data to localStorage and optionally sync to local server
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    renderFilters();
    renderCards();
    
    // Auto-sync with local Python server if available
    syncWithLocalServer();
  } catch (e) {
    console.error("Tallennusvirhe:", e);
    showToast("Virhe tallennuksessa!");
  }
}

// Render tabs counts
function renderFilters() {
  const counts = {
    all: items.length,
    watching: items.filter(i => i.status === "watching").length,
    watchlist: items.filter(i => i.status === "watchlist").length,
    completed: items.filter(i => i.status === "completed").length
  };

  document.getElementById("countAll").textContent = counts.all;
  document.getElementById("countWatching").textContent = counts.watching;
  document.getElementById("countWatchlist").textContent = counts.watchlist;
  document.getElementById("countCompleted").textContent = counts.completed;
}

// Filter and search items
function getFilteredItems() {
  return items.filter(item => {
    // Status filter
    if (currentFilter !== "all" && item.status !== currentFilter) {
      return false;
    }
    // Platform filter
    if (currentPlatform !== "all" && item.platform !== currentPlatform) {
      return false;
    }
    // Search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(q);
      const genreMatch = item.genres && item.genres.some(g => g.toLowerCase().includes(q));
      const castMatch = item.cast && item.cast.toLowerCase().includes(q);
      const platformMatch = item.platform && item.platform.toLowerCase().includes(q);
      return titleMatch || genreMatch || castMatch || platformMatch;
    }
    return true;
  });
}

// Render cards
function renderCards() {
  const filtered = getFilteredItems();
  cardsGrid.innerHTML = "";

  if (filtered.length === 0) {
    cardsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-dim);">
        <div style="font-size: 36px; margin-bottom: 8px;">🍿</div>
        <div style="font-size: 16px; font-weight: 700; color: var(--text-muted);">Ei nimikkeitä valitulla suodatuksella</div>
        <div style="font-size: 13px; margin-top: 4px;">Kokeile toista suodatinta tai lisää uusi sarja / leffa.</div>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.onclick = () => openDetailModal(item.id);

    // Platform class
    let platformClass = "default";
    const p = item.platform.toLowerCase();
    if (p.includes("apple")) platformClass = "apple";
    else if (p.includes("netflix")) platformClass = "netflix";
    else if (p.includes("prime")) platformClass = "prime";
    else if (p.includes("hbo") || p.includes("max")) platformClass = "hbo";

    // Status label & class
    let statusLabel = "Listalla";
    if (item.status === "watching") statusLabel = "Kesken";
    else if (item.status === "completed") statusLabel = "Katsottu";

    // Rating stars
    let ratingStars = "";
    if (item.rating && item.rating > 0) {
      ratingStars = "★".repeat(item.rating) + "☆".repeat(5 - item.rating);
    }

    card.innerHTML = `
      <div class="poster-wrapper">
        ${item.posterUrl ? `
          <img src="${item.posterUrl}" alt="${item.title}" class="poster-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="poster-fallback" style="display: none;">
            <div class="poster-fallback-icon">🎬</div>
            <div class="poster-fallback-title">${item.title}</div>
          </div>
        ` : `
          <div class="poster-fallback">
            <div class="poster-fallback-icon">🎬</div>
            <div class="poster-fallback-title">${item.title}</div>
          </div>
        `}
        <div class="badge-platform ${platformClass}">${item.platform}</div>
        <div class="badge-status ${item.status}">${statusLabel}</div>
      </div>
      <div class="card-info">
        <div class="card-title">${item.title}</div>
        <div class="card-meta">
          <span>${item.year || ""}</span>
          ${item.genres && item.genres.length > 0 ? `<span>• ${item.genres[0]}</span>` : ""}
        </div>
        ${item.progress ? `<div class="card-progress">${item.progress}</div>` : ""}
        ${ratingStars ? `<div class="card-rating">${ratingStars}</div>` : ""}
      </div>
    `;

    cardsGrid.appendChild(card);
  });
}

// Open Detail Modal
function openDetailModal(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  activeItem = item;

  // Set to view mode initially
  toggleDetailEditMode(false);

  // Populate view fields
  document.getElementById("detailTitle").textContent = item.title;
  document.getElementById("detailYearType").textContent = `${item.year || ""} • ${item.type === "series" ? "Sarja" : item.type === "miniseries" ? "Minisarja" : "Elokuva"} • ${item.platform}`;
  
  // Status badge
  const statusBadge = document.getElementById("detailStatusBadge");
  statusBadge.className = `badge-status ${item.status}`;
  statusBadge.style.position = "static";
  statusBadge.style.marginLeft = "6px";
  if (item.status === "watching") statusBadge.textContent = "Kesken";
  else if (item.status === "watchlist") statusBadge.textContent = "Listalla";
  else statusBadge.textContent = "Katsottu";

  // Rating
  const ratingBox = document.getElementById("detailRatingDisplay");
  if (item.rating && item.rating > 0) {
    ratingBox.textContent = "★".repeat(item.rating) + "☆".repeat(5 - item.rating);
    ratingBox.style.display = "block";
  } else {
    ratingBox.textContent = "Ei arviota";
    ratingBox.style.color = "var(--text-dim)";
  }

  // Progress & Notes
  const progBox = document.getElementById("detailProgressBox");
  if (item.progress) {
    progBox.textContent = `📍 ${item.progress}`;
    progBox.style.display = "block";
  } else {
    progBox.style.display = "none";
  }

  const notesBox = document.getElementById("detailNotesBox");
  if (item.notes) {
    notesBox.textContent = `📝 ${item.notes}`;
    notesBox.style.display = "block";
  } else {
    notesBox.style.display = "none";
  }

  // Synopsis, Cast, Creator
  document.getElementById("detailSynopsis").textContent = item.synopsis || "Ei kuvausta.";
  document.getElementById("detailCast").textContent = item.cast || "Ei tekijätietoja.";
  document.getElementById("detailCreator").textContent = item.creator || "-";

  // Genres
  const tagsContainer = document.getElementById("detailGenres");
  tagsContainer.innerHTML = "";
  if (item.genres && item.genres.length > 0) {
    item.genres.forEach(g => {
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = g;
      tagsContainer.appendChild(pill);
    });
  }

  // Poster
  const posterBox = document.getElementById("detailPosterBox");
  if (item.posterUrl) {
    posterBox.innerHTML = `<img src="${item.posterUrl}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">`;
  } else {
    posterBox.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 32px;">🎬</div>`;
  }

  // Link button
  const linkBtn = document.getElementById("detailLinkBtn");
  if (item.link) {
    linkBtn.href = item.link;
    linkBtn.style.display = "inline-flex";
  } else {
    linkBtn.style.display = "none";
  }

  detailModal.classList.add("active");
}

// Toggle between View Mode and Edit Mode in Detail Modal
function toggleDetailEditMode(forceState) {
  const viewContainer = document.getElementById("detailViewContainer");
  const editContainer = document.getElementById("detailEditContainer");
  const titleHeader = document.getElementById("detailSheetTitle");
  const toggleBtn = document.getElementById("detailToggleEditBtn");

  const toEdit = forceState !== undefined ? forceState : (viewContainer.style.display !== "none");

  if (toEdit && activeItem) {
    // Switch to Edit Mode
    viewContainer.style.display = "none";
    editContainer.style.display = "flex";
    titleHeader.textContent = "Muokkaa tietoja";
    toggleBtn.style.display = "none";

    // Populate all editable fields
    document.getElementById("detailEditTitle").value = activeItem.title || "";
    document.getElementById("detailEditYear").value = activeItem.year || "";
    document.getElementById("detailEditType").value = activeItem.type || "movie";
    document.getElementById("detailEditPlatform").value = activeItem.platform || "Apple TV+";
    document.getElementById("detailEditStatus").value = activeItem.status || "watchlist";
    document.getElementById("detailEditRating").value = activeItem.rating || "0";
    document.getElementById("detailEditProgress").value = activeItem.progress || "";
    document.getElementById("detailEditPosterUrl").value = activeItem.posterUrl || "";
    document.getElementById("detailEditGenres").value = (activeItem.genres || []).join(", ");
    document.getElementById("detailEditCast").value = activeItem.cast || "";
    document.getElementById("detailEditCreator").value = activeItem.creator || "";
    document.getElementById("detailEditSynopsis").value = activeItem.synopsis || "";
    document.getElementById("detailEditNotes").value = activeItem.notes || "";
    document.getElementById("detailEditLink").value = activeItem.link || "";
  } else {
    // Switch to View Mode
    viewContainer.style.display = "flex";
    editContainer.style.display = "none";
    titleHeader.textContent = "Tiedot & Tilanne";
    toggleBtn.style.display = "inline-flex";
  }
}

// Save Full Edits
function saveFullItemEdits(e) {
  if (e) e.preventDefault();
  if (!activeItem) return;

  activeItem.title = document.getElementById("detailEditTitle").value.trim() || activeItem.title;
  activeItem.year = document.getElementById("detailEditYear").value.trim();
  activeItem.type = document.getElementById("detailEditType").value;
  activeItem.platform = document.getElementById("detailEditPlatform").value;
  activeItem.status = document.getElementById("detailEditStatus").value;
  activeItem.rating = parseInt(document.getElementById("detailEditRating").value, 10) || 0;
  activeItem.progress = document.getElementById("detailEditProgress").value.trim();
  activeItem.posterUrl = document.getElementById("detailEditPosterUrl").value.trim();
  activeItem.genres = document.getElementById("detailEditGenres").value.split(",").map(g => g.trim()).filter(Boolean);
  activeItem.cast = document.getElementById("detailEditCast").value.trim();
  activeItem.creator = document.getElementById("detailEditCreator").value.trim();
  activeItem.synopsis = document.getElementById("detailEditSynopsis").value.trim();
  activeItem.notes = document.getElementById("detailEditNotes").value.trim();
  activeItem.link = document.getElementById("detailEditLink").value.trim();
  activeItem.updatedAt = new Date().toISOString().split("T")[0];

  saveData();
  openDetailModal(activeItem.id);
  showToast("✅ Muutokset tallennettu!");
}

// Close Modals
function closeModals() {
  detailModal.classList.remove("active");
  addModal.classList.remove("active");
  syncModal.classList.remove("active");
  activeItem = null;
}

// Delete Active Item
function deleteActiveItem() {
  if (!activeItem) return;
  if (confirm(`Haluatko varmasti poistaa nimikkeen "${activeItem.title}"?`)) {
    items = items.filter(i => i.id !== activeItem.id);
    saveData();
    closeModals();
    showToast("Nimike poistettu!");
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    searchClearBtn.style.display = searchQuery ? "block" : "none";
    renderCards();
  });

  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    searchClearBtn.style.display = "none";
    renderCards();
  });

  // Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.status;
      renderCards();
    });
  });

  // Platform chips
  chipButtons.forEach(chip => {
    chip.addEventListener("click", () => {
      chipButtons.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentPlatform = chip.dataset.platform;
      renderCards();
    });
  });

  // Modal overlays click outside to close
  [detailModal, addModal, syncModal].forEach(m => {
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModals();
    });
  });

  // TVMaze Live Search for Adding Items
  const autoSearchInput = document.getElementById("autoSearchInput");
  const autoResultsList = document.getElementById("autoResultsList");
  let searchTimeout = null;

  autoSearchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearTimeout(searchTimeout);
    if (q.length < 2) {
      autoResultsList.style.display = "none";
      return;
    }

    searchTimeout = setTimeout(() => {
      searchMoviesAndShows(q);
    }, 350);
  });
}

// Combined Search: OMDb (Cinema & Classic/Modern Movies) + TVMaze (Series)
async function searchMoviesAndShows(query) {
  const autoResultsList = document.getElementById("autoResultsList");
  try {
    // 1. Fetch OMDb (all movies and films)
    const omdbPromise = fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=trilogy`)
      .then(r => r.json())
      .catch(() => ({ Response: "False" }));

    // 2. Fetch TVMaze (TV series)
    const tvmazePromise = fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .catch(() => []);

    const [omdbRes, tvmazeRes] = await Promise.all([omdbPromise, tvmazePromise]);

    const combined = [];

    // Process OMDb results (movies and series)
    if (omdbRes && omdbRes.Response === "True" && Array.isArray(omdbRes.Search)) {
      omdbRes.Search.slice(0, 6).forEach(m => {
        combined.push({
          source: "omdb",
          id: m.imdbID,
          title: m.Title,
          year: m.Year,
          type: m.Type === "series" ? "Sarja" : "Elokuva",
          thumb: m.Poster && m.Poster !== "N/A" ? m.Poster : "",
          raw: m
        });
      });
    }

    // Process TVMaze results
    if (Array.isArray(tvmazeRes)) {
      tvmazeRes.slice(0, 4).forEach(t => {
        const show = t.show;
        // Avoid duplicate by title if already from OMDb
        if (!combined.some(c => c.title.toLowerCase() === show.name.toLowerCase())) {
          combined.push({
            source: "tvmaze",
            id: show.id,
            title: show.name,
            year: show.premiered ? show.premiered.substring(0, 4) : "",
            type: "Sarja",
            thumb: show.image?.medium || show.image?.original || "",
            raw: show
          });
        }
      });
    }

    if (combined.length === 0) {
      autoResultsList.style.display = "none";
      return;
    }

    autoResultsList.innerHTML = "";
    combined.slice(0, 8).forEach(item => {
      const div = document.createElement("div");
      div.className = "search-result-item";
      div.onclick = () => selectSearchResult(item);

      const typeIcon = item.type === "Elokuva" ? "🎬" : "📺";

      div.innerHTML = `
        ${item.thumb ? `<img src="${item.thumb}" class="search-result-thumb">` : `<div class="search-result-thumb" style="display:flex;align-items:center;justify-content:center;">${typeIcon}</div>`}
        <div class="search-result-info">
          <div class="search-result-title">${item.title} (${item.year})</div>
          <div class="search-result-sub">${typeIcon} ${item.type}</div>
        </div>
      `;
      autoResultsList.appendChild(div);
    });
    autoResultsList.style.display = "block";
  } catch (err) {
    console.error("Search error:", err);
  }
}

// Select result from search
async function selectSearchResult(item) {
  const autoResultsList = document.getElementById("autoResultsList");

  if (item.source === "omdb") {
    showToast(`Haetaan tietoja: ${item.title}...`);
    try {
      const res = await fetch(`https://www.omdbapi.com/?i=${item.id}&apikey=trilogy`);
      const d = await res.json();
      if (d && d.Response === "True") {
        document.getElementById("addTitle").value = d.Title || item.title;
        document.getElementById("addYear").value = (d.Year || "").replace(/[^0-9]/g, "").substring(0, 4);
        document.getElementById("addType").value = d.Type === "series" ? "series" : "movie";
        document.getElementById("addPosterUrl").value = d.Poster && d.Poster !== "N/A" ? d.Poster : "";
        document.getElementById("addGenres").value = d.Genre && d.Genre !== "N/A" ? d.Genre : "";
        document.getElementById("addCast").value = d.Actors && d.Actors !== "N/A" ? d.Actors : "";
        document.getElementById("addCreator").value = d.Director && d.Director !== "N/A" ? d.Director : (d.Writer && d.Writer !== "N/A" ? d.Writer : "");
        document.getElementById("addSynopsis").value = d.Plot && d.Plot !== "N/A" ? d.Plot : "";
        document.getElementById("addLink").value = `https://www.imdb.com/title/${d.imdbID}/`;
        if (d.imdbRating && d.imdbRating !== "N/A") {
          const stars = Math.min(5, Math.max(1, Math.round(parseFloat(d.imdbRating) / 2)));
          document.getElementById("addRating").value = String(stars);
        }
      }
    } catch (e) {
      console.error("OMDb detail error:", e);
    }
  } else if (item.source === "tvmaze") {
    selectTVMazeShow(item.raw);
  }

  autoResultsList.style.display = "none";
  document.getElementById("autoSearchInput").value = "";
  showToast(`Valittu: ${item.title}`);
}

// Fill form from TVMaze show
function selectTVMazeShow(show) {
  document.getElementById("addTitle").value = show.name;
  document.getElementById("addYear").value = show.premiered ? show.premiered.substring(0, 4) : "";
  document.getElementById("addType").value = "series";
  document.getElementById("addPosterUrl").value = show.image?.original || show.image?.medium || "";
  document.getElementById("addSynopsis").value = show.summary ? show.summary.replace(/<[^>]+>/g, "") : "";
  document.getElementById("addGenres").value = show.genres ? show.genres.join(", ") : "";
  if (show.officialSite) document.getElementById("addLink").value = show.officialSite;

  // Best guess platform
  const net = (show.network?.name || show.webChannel?.name || "").toLowerCase();
  if (net.includes("apple")) document.getElementById("addPlatform").value = "Apple TV+";
  else if (net.includes("netflix")) document.getElementById("addPlatform").value = "Netflix";
  else if (net.includes("prime") || net.includes("amazon")) document.getElementById("addPlatform").value = "Prime Video";
  else if (net.includes("hbo") || net.includes("max")) document.getElementById("addPlatform").value = "HBO Max";
  else if (net.includes("disney")) document.getElementById("addPlatform").value = "Disney+";
}

// Add Item Submit
function submitAddItem(e) {
  e.preventDefault();
  const title = document.getElementById("addTitle").value.trim();
  if (!title) {
    alert("Syötä vähintään nimi!");
    return;
  }

  const newItem = {
    id: "item-" + Date.now(),
    title: title,
    originalTitle: title,
    type: document.getElementById("addType").value,
    year: document.getElementById("addYear").value.trim(),
    platform: document.getElementById("addPlatform").value,
    status: document.getElementById("addStatus").value,
    progress: document.getElementById("addProgress").value.trim(),
    posterUrl: document.getElementById("addPosterUrl").value.trim(),
    genres: document.getElementById("addGenres").value.split(",").map(g => g.trim()).filter(Boolean),
    cast: document.getElementById("addCast").value.trim(),
    creator: document.getElementById("addCreator").value.trim(),
    synopsis: document.getElementById("addSynopsis").value.trim(),
    notes: document.getElementById("addNotes").value.trim(),
    rating: parseInt(document.getElementById("addRating").value, 10) || 0,
    link: document.getElementById("addLink").value.trim(),
    updatedAt: new Date().toISOString().split("T")[0]
  };

  items.unshift(newItem);
  saveData();
  closeModals();
  document.getElementById("addItemForm").reset();
  showToast(`Lisätty: ${newItem.title}`);
}

// Open Add Modal
function openAddModal() {
  document.getElementById("addItemForm").reset();
  document.getElementById("autoResultsList").style.display = "none";
  addModal.classList.add("active");
}

// Open Sync Modal
function openSyncModal() {
  const token = localStorage.getItem(DROPBOX_TOKEN_KEY) || "";
  document.getElementById("dropboxTokenInput").value = token;
  syncModal.classList.add("active");
}

// Save Dropbox Token
function saveDropboxToken() {
  const token = document.getElementById("dropboxTokenInput").value.trim();
  localStorage.setItem(DROPBOX_TOKEN_KEY, token);
  showToast("Dropbox-avain tallennettu!");
}

// Upload to Dropbox API directly from mobile/browser
async function uploadToDropbox() {
  const token = localStorage.getItem(DROPBOX_TOKEN_KEY) || document.getElementById("dropboxTokenInput").value.trim();
  if (!token) {
    alert("Syötä ensin Dropbox Access Token asetuksissa!");
    return;
  }

  showToast("Tallennetaan Dropboxiin...");
  try {
    const content = JSON.stringify(items, null, 2);
    const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Dropbox-API-Arg": JSON.stringify({
          path: "/katselulista.json",
          mode: "overwrite",
          autorename: false,
          mute: false,
          strict_conflict: false
        }),
        "Content-Type": "application/octet-stream"
      },
      body: content
    });

    if (res.ok) {
      showToast("✅ Tallennettu Dropboxiin onnistuneesti!");
    } else {
      const err = await res.json();
      console.error("Dropbox error:", err);
      alert("Dropbox-virhe: " + (err.error_summary || "Tarkista token"));
    }
  } catch (e) {
    console.error("Upload error:", e);
    alert("Yhteysvirhe Dropboxiin: " + e.message);
  }
}

// Download from Dropbox API directly
async function downloadFromDropbox() {
  const token = localStorage.getItem(DROPBOX_TOKEN_KEY) || document.getElementById("dropboxTokenInput").value.trim();
  if (!token) {
    alert("Syötä ensin Dropbox Access Token!");
    return;
  }

  showToast("Ladataan Dropboxista...");
  try {
    const res = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Dropbox-API-Arg": JSON.stringify({
          path: "/katselulista.json"
        })
      }
    });

    if (res.ok) {
      const downloadedItems = await res.json();
      if (Array.isArray(downloadedItems)) {
        items = downloadedItems;
        saveData();
        showToast("✅ Ladattu ja päivitetty Dropboxista!");
      }
    } else {
      const err = await res.text();
      alert("Dropbox-latausvirhe: " + err);
    }
  } catch (e) {
    alert("Yhteysvirhe: " + e.message);
  }
}

// Load default curated list from katselulista.json
async function loadDefaultListFromJSON() {
  showToast("Ladataan nimikkeitä...");
  try {
    const res = await fetch("katselulista.json");
    if (!res.ok) throw new Error("Tiedostoa ei löytynyt");
    const list = await res.json();
    if (Array.isArray(list) && list.length > 0) {
      items = list;
      saveData();
      closeModals();
      showToast(`✅ Ladattu ${items.length} nimikettä listalle!`);
    } else {
      alert("Tiedosto oli tyhjä.");
    }
  } catch (err) {
    console.error("Latausvirhe:", err);
    alert("Virhe listan lataamisessa: " + err.message);
  }
}

// Export JSON file to local / Files app
function exportJSONFile() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
  const a = document.createElement("a");
  a.setAttribute("href", dataStr);
  a.setAttribute("download", `katselulista_${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast("JSON-tiedosto ladattu!");
}

// Import JSON file
function importJSONFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (Array.isArray(imported)) {
        items = imported;
        saveData();
        showToast("✅ Tuotu onnistuneesti!");
      } else {
        alert("Tiedosto ei ole oikeassa muodossa (odotettiin listaa).");
      }
    } catch (err) {
      alert("Virhe JSON-tiedoston lukemisessa: " + err.message);
    }
  };
  reader.readAsText(file);
}

// Generate Markdown for Obsidian
function exportToObsidianMarkdown() {
  let md = "---\nname: Katselulista\ntags:\n  - katselulista\n  - leffat\n  - sarjat\nupdated: " + new Date().toISOString().split("T")[0] + "\n---\n\n";
  md += "# 🎬 Katselulista – Leffat & Sarjat\n\n";

  // Watching
  md += "## ⏳ 1. Kesken / Meneillään\n\n";
  const watching = items.filter(i => i.status === "watching");
  watching.forEach(i => {
    md += `### 📺 ${i.title}\n`;
    md += `- **Alusta:** ${i.platform}\n`;
    if (i.progress) md += `- **Tilanne:** ${i.progress}\n`;
    if (i.genres && i.genres.length > 0) md += `- **Genre:** ${i.genres.join(", ")}\n`;
    if (i.cast) md += `- **Pääosissa:** ${i.cast}\n`;
    if (i.notes) md += `- **Muistiinpanot:** ${i.notes}\n`;
    md += "\n";
  });

  // Watchlist
  md += "## 🍿 2. Katselulistalla (Seuraavaksi)\n\n";
  const watchlist = items.filter(i => i.status === "watchlist");
  watchlist.forEach(i => {
    md += `### 📺 ${i.title}\n`;
    md += `- **Alusta:** ${i.platform}\n`;
    if (i.genres && i.genres.length > 0) md += `- **Genre:** ${i.genres.join(", ")}\n`;
    if (i.cast) md += `- **Pääosissa:** ${i.cast}\n`;
    if (i.synopsis) md += `- **Kuvaus:** ${i.synopsis}\n`;
    if (i.link) md += `- **Linkki:** ${i.link}\n`;
    md += "\n";
  });

  // Completed
  md += "## ✅ 3. Katsotut & Arviot\n\n";
  const completed = items.filter(i => i.status === "completed");
  completed.forEach(i => {
    md += `### 📺 ${i.title}\n`;
    md += `- **Alusta:** ${i.platform}\n`;
    if (i.rating) md += `- **Arvio:** ${"★".repeat(i.rating)}\n`;
    if (i.notes) md += `- **Kommentti:** ${i.notes}\n`;
    md += "\n";
  });

  navigator.clipboard.writeText(md).then(() => {
    showToast("📋 Markdown kopioitu leikepöydälle!");
  }).catch(() => {
    showToast("Valmis Markdown luotu.");
  });
}

// Auto-sync with local Python server (if running)
async function syncWithLocalServer() {
  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items)
    });
  } catch (e) {
    // Normal when running as static file without local server
  }
}

// Toast Notification
function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// Launch
window.addEventListener("DOMContentLoaded", initApp);
