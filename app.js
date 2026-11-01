/**
 * Katselulista – Mobile/iPad Web App Engine
 * Ominaisuudet: Lajittelu, tyyppisuodatus, haku, alustasuodatus, satunnaisvalinta, lista-/korttinäkymä
 */

// App State
let items = [];
let currentFilter = "all";
let currentPlatform = "all";
let currentType = "all";
let currentSort = "recent";
let currentView = "grid"; 
let searchQuery = "";
let activeItem = null;
let currentRolledItem = null;

// Storage Keys
const STORAGE_KEY = "katselulista_items_v1";
const DROPBOX_TOKEN_KEY = "katselulista_dropbox_token";
const VIEW_PREF_KEY = "katselulista_view_pref";
const SORT_PREF_KEY = "katselulista_sort_pref";

// Elements (with ?. defensive programming checks in case HTML hasn't fully parsed)
const cardsGrid = () => document.getElementById("cardsGrid");
const cardsList = () => document.getElementById("cardsList");
const searchInput = document.getElementById("searchInput");
const searchClearBtn = document.getElementById("searchClearBtn");
const tabButtons = document.querySelectorAll(".tab-btn");
const chipButtons = document.querySelectorAll(".chip-btn");
const sortSelect = document.getElementById("sortSelect");
const typeFilterSelect = document.getElementById("typeFilterSelect");
const headerCountSub = document.getElementById("headerCountSub");

// Modals
const detailModal = document.getElementById("detailModal");
const addModal = document.getElementById("addModal");
const syncModal = document.getElementById("syncModal");
const randomModal = document.getElementById("randomModal");
const toast = document.getElementById("toast");

// Initialize
function initApp() {
  loadPreferences();
  loadData();
  setupEventListeners();
}

function loadPreferences() {
  const savedView = localStorage.getItem(VIEW_PREF_KEY);
  if (savedView === "list" || savedView === "grid") {
    currentView = savedView;
  }
  const savedSort = localStorage.getItem(SORT_PREF_KEY);
  if (savedSort && sortSelect) {
    currentSort = savedSort;
    sortSelect.value = savedSort;
  }
}

// Load data from localStorage (or fallback to original JSON loading strategy)
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        items = parsed;
      }
      renderFilters();
      renderView();
    } else {
      // Jos muisti on täysin tyhjä, yritetään ladata alkuperäinen JSON palvelimelta
      loadDefaultListFromJSON();
    }
  } catch (e) {
    console.error("Virhe ladattaessa muistista:", e);
    items = [];
    renderFilters();
    renderView();
  }
}

async function loadDefaultListFromJSON() {
  try {
    const res = await fetch("katselulista.json");
    if (!res.ok) throw new Error("Ei tiedostoa");
    const list = await res.json();
    if (Array.isArray(list)) {
      items = list;
      saveData();
    }
  } catch (err) {
    console.log("Ei paikallista katselulista.json -tiedostoa. Aloitetaan tyhjällä listalla.");
    items = [];
    renderFilters();
    renderView();
  }
}

// Save data to localStorage and trigger auto-syncs
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    renderFilters();
    renderView();
    syncWithLocalServer();
    
    // Auto-sync to Dropbox silently in the background
    uploadToDropbox(true);
  } catch (e) {
    console.error("Tallennusvirhe:", e);
    showToast("Virhe tallennuksessa!");
  }
}

// Generates a cinematic gradient background based on the title's hash
function getTitleGradient(title) {
  if (!title) return "linear-gradient(135deg, #151c2c 0%, #0d121c 100%)";
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 45%, 16%) 0%, hsl(${h2}, 55%, 8%) 100%)`;
}

// Render tabs counts
function renderFilters() {
  const counts = {
    all: items.length,
    watching: items.filter(i => i.status === "watching").length,
    watchlist: items.filter(i => i.status === "watchlist").length,
    completed: items.filter(i => i.status === "completed").length
  };

  if(document.getElementById("countAll")) document.getElementById("countAll").textContent = counts.all;
  if(document.getElementById("countWatching")) document.getElementById("countWatching").textContent = counts.watching;
  if(document.getElementById("countWatchlist")) document.getElementById("countWatchlist").textContent = counts.watchlist;
  if(document.getElementById("countCompleted")) document.getElementById("countCompleted").textContent = counts.completed;

  if (headerCountSub) {
    headerCountSub.textContent = `${items.length} nimikettä listalla`;
  }
}

// Helper: Platform css class
function getPlatformClass(platform) {
  if (!platform) return "default";
  const p = platform.toLowerCase();
  if (p.includes("apple")) return "apple";
  if (p.includes("netflix")) return "netflix";
  if (p.includes("prime")) return "prime";
  if (p.includes("hbo") || p.includes("max")) return "hbo";
  if (p.includes("disney")) return "disney";
  if (p.includes("areena")) return "areena";
  if (p.includes("skyshowtime")) return "skyshowtime";
  if (p.includes("ruutu")) return "ruutu";
  return "default";
}

function getTypeLabel(type) {
  if (type === "series") return "Sarja";
  if (type === "miniseries") return "Minisarja";
  if (type === "movie") return "Elokuva";
  if (type === "doc") return "Dokumentti";
  return "Nimike";
}

// Filter and sort items
function getFilteredAndSortedItems() {
  // 1. Suodatus
  let filtered = items.filter(item => {
    if (currentFilter !== "all" && item.status !== currentFilter) return false;
    if (currentPlatform !== "all" && item.platform !== currentPlatform) return false;
    if (currentType !== "all" && item.type !== currentType) return false;
    
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const titleMatch = (item.title || "").toLowerCase().includes(q);
      const originalTitleMatch = (item.originalTitle || "").toLowerCase().includes(q);
      const genreMatch = item.genres && item.genres.some(g => g.toLowerCase().includes(q));
      const castMatch = (item.cast || "").toLowerCase().includes(q);
      const creatorMatch = (item.creator || "").toLowerCase().includes(q);
      const platformMatch = (item.platform || "").toLowerCase().includes(q);
      const notesMatch = (item.notes || "").toLowerCase().includes(q);
      return titleMatch || originalTitleMatch || genreMatch || castMatch || creatorMatch || platformMatch || notesMatch;
    }
    return true;
  });

  // 2. Lajittelu
  filtered.sort((a, b) => {
    switch (currentSort) {
      case "titleAsc":
        return (a.title || "").localeCompare(b.title || "", "fi");
      case "titleDesc":
        return (b.title || "").localeCompare(a.title || "", "fi");
      case "yearDesc":
        return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0);
      case "yearAsc":
        return (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0);
      case "ratingDesc":
        return (b.rating || 0) - (a.rating || 0);
      case "ratingAsc":
        return (a.rating || 0) - (b.rating || 0);
      case "oldest":
        return (a.id || "").localeCompare(b.id || "");
      case "recent":
      default:
        // Viimeksi päivitetyt / lisätyt ensin
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return (b.id || "").localeCompare(a.id || "");
    }
  });

  return filtered;
}

function renderView() {
  const filtered = getFilteredAndSortedItems();
  const gridBtn = document.getElementById("viewGridBtn");
  const listBtn = document.getElementById("viewListBtn");
  const gridEl = cardsGrid();
  const listEl = cardsList();

  if (currentView === "list") {
    if (gridEl) gridEl.style.display = "none";
    if (listEl) listEl.style.display = "flex";
    if (gridBtn) gridBtn.classList.remove("active");
    if (listBtn) listBtn.classList.add("active");
    renderCompactList(filtered);
  } else {
    if (gridEl) gridEl.style.display = "grid";
    if (listEl) listEl.style.display = "none";
    if (gridBtn) gridBtn.classList.add("active");
    if (listBtn) listBtn.classList.remove("active");
    renderCards(filtered);
  }
}

// Render cards (Grid View)
function renderCards(filtered) {
  const gridEl = cardsGrid();
  if (!gridEl) return;
  gridEl.innerHTML = "";

  if (filtered.length === 0) {
    gridEl.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-dim);">
        <div style="font-size: 36px; margin-bottom: 8px;">🍿</div>
        <div style="font-size: 16px; font-weight: 700; color: var(--text-muted);">Ei nimikkeitä valitulla suodatuksella</div>
        <div style="font-size: 13px; margin-top: 4px;">Kokeile toista suodatinta tai nollaa haku.</div>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "movie-card";
    card.onclick = () => openDetailModal(item.id);

    const platformClass = getPlatformClass(item.platform);
    const bgGradient = getTitleGradient(item.title);

    let statusLabel = "Listalla";
    if (item.status === "watching") statusLabel = "Kesken";
    else if (item.status === "completed") statusLabel = "Katsottu";

    let ratingStars = "";
    if (item.rating && item.rating > 0) {
      ratingStars = "★".repeat(item.rating) + "☆".repeat(5 - item.rating);
    }

    card.innerHTML = `
      <div class="poster-wrapper">
        ${item.posterUrl ? `
          <img src="${item.posterUrl}" alt="${item.title}" class="poster-img" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="poster-fallback" style="display: none; background: ${bgGradient};">
            <div class="poster-fallback-icon">🎬</div>
            <div class="poster-fallback-title">${item.title}</div>
          </div>
        ` : `
          <div class="poster-fallback" style="background: ${bgGradient};">
            <div class="poster-fallback-icon">🎬</div>
            <div class="poster-fallback-title">${item.title}</div>
          </div>
        `}
        <div class="badge-platform ${platformClass}">${item.platform || "Muu"}</div>
        <div class="badge-status ${item.status}">${statusLabel}</div>
      </div>
      <div class="card-info">
        <div class="card-title">${item.title}</div>
        <div class="card-meta">
          <span>${item.year || ""}</span>
          ${item.genres && item.genres.length > 0 ? `<span>• ${item.genres[0]}</span>` : ""}
        </div>
        ${item.progress ? `<div class="card-progress">📍 ${item.progress}</div>` : ""}
        <div class="card-footer-row">
          ${ratingStars ? `<div class="card-rating">${ratingStars}</div>` : `<span style="flex:1;"></span>`}
          <button class="btn-card-trailer" onclick="event.stopPropagation(); openTrailerByItemId('${item.id}')" title="Katso traileri YouTubesta">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            <span>Traileri</span>
          </button>
        </div>
      </div>
    `;
    gridEl.appendChild(card);
  });
}

// Render Compact List View
function renderCompactList(filtered) {
  const listEl = cardsList();
  if (!listEl) return;
  listEl.innerHTML = "";

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 48px 16px; color: var(--text-dim);">
        <div style="font-size: 36px; margin-bottom: 8px;">🍿</div>
        <div style="font-size: 16px; font-weight: 700; color: var(--text-muted);">Ei nimikkeitä valitulla suodatuksella</div>
        <div style="font-size: 13px; margin-top: 4px;">Kokeile toista suodatinta tai nollaa haku.</div>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement("div");
    row.className = "list-item-row";
    row.onclick = () => openDetailModal(item.id);

    let statusLabel = "Listalla";
    if (item.status === "watching") statusLabel = "Kesken";
    else if (item.status === "completed") statusLabel = "Katsottu";

    const platformClass = getPlatformClass(item.platform);
    const bgGradient = getTitleGradient(item.title);

    let ratingStars = "";
    if (item.rating && item.rating > 0) {
      ratingStars = "★".repeat(item.rating) + "☆".repeat(5 - item.rating);
    }

    row.innerHTML = `
      ${item.posterUrl ? `
        <img src="${item.posterUrl}" alt="${item.title}" class="list-item-thumb" onerror="this.outerHTML='<div class=\\'list-item-thumb-fallback\\' style=\\'background: ${bgGradient}\\'>🎬</div>'">
      ` : `
        <div class="list-item-thumb-fallback" style="background: ${bgGradient}">🎬</div>
      `}
      <div class="list-item-main">
        <div class="list-item-title">${item.title}</div>
        <div class="list-item-sub">
          <span>${item.year || "-"}</span>
          <span>•</span>
          <span>${getTypeLabel(item.type)}</span>
          ${item.progress ? `<span>• <span style="color: var(--gold); font-weight: 600;">${item.progress}</span></span>` : ""}
        </div>
      </div>
      <div class="list-item-meta-right">
        <div style="display: flex; gap: 4px; align-items: center;">
          <div class="badge-platform ${platformClass}" style="position: static; font-size: 9px; padding: 2px 6px;">${item.platform || "Muu"}</div>
          <div class="badge-status ${item.status}" style="position: static; font-size: 9px; padding: 2px 6px;">${statusLabel}</div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center; justify-content: flex-end; margin-top: 4px;">
          ${ratingStars ? `<div style="font-size: 10px; color: var(--gold);">${ratingStars}</div>` : ""}
          <button class="btn-card-trailer btn-trailer-mini" onclick="event.stopPropagation(); openTrailerByItemId('${item.id}')" title="Katso traileri YouTubesta">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            <span>Traileri</span>
          </button>
        </div>
      </div>
    `;
    listEl.appendChild(row);
  });
}

function switchView(mode) {
  currentView = mode;
  localStorage.setItem(VIEW_PREF_KEY, mode);
  renderView();
}

function rollRandomItem() {
  let pool = items.filter(i => i.status === "watchlist" || i.status === "watching");
  if (pool.length === 0) pool = items; 

  if (pool.length === 0) {
    showToast("Katselulistasi on tyhjä!");
    return;
  }

  const randomIdx = Math.floor(Math.random() * pool.length);
  const picked = pool[randomIdx];
  currentRolledItem = picked;

  const contentBox = document.getElementById("randomCardContent");
  if (!contentBox) return;

  const platformClass = getPlatformClass(picked.platform);
  const bgGradient = getTitleGradient(picked.title);
  let statusLabel = picked.status === "watching" ? "Kesken" : picked.status === "completed" ? "Katsottu" : "Listalla";

  contentBox.innerHTML = `
    ${picked.posterUrl ? `
      <img src="${picked.posterUrl}" alt="${picked.title}" class="random-poster">
    ` : `
      <div class="random-poster" style="display:flex;align-items:center;justify-content:center;background:${bgGradient};font-size:36px;">🎬</div>
    `}
    <div>
      <div class="random-title">${picked.title}</div>
      <div class="random-meta">${picked.year || ""} • ${getTypeLabel(picked.type)} • ${picked.platform}</div>
      <div style="display: flex; gap: 6px; justify-content: center; margin-top: 6px;">
        <span class="badge-platform ${platformClass}" style="position: static;">${picked.platform}</span>
        <span class="badge-status ${picked.status}" style="position: static;">${statusLabel}</span>
      </div>
    </div>
    ${picked.progress ? `<div style="font-size: 12px; color: var(--gold); font-weight: 600;">📍 ${picked.progress}</div>` : ""}
    ${picked.synopsis ? `<p class="random-synopsis">${picked.synopsis}</p>` : ""}
  `;

  document.getElementById("randomOpenDetailBtn").onclick = () => {
    closeModals();
    openDetailModal(picked.id);
  };

  if(randomModal) randomModal.classList.add("active");
}

// YouTube Trailer Search
function openYouTubeTrailer(title, year) {
  const query = `${title || ""} ${year || ""} trailer`.trim();
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function openTrailerByItemId(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  openYouTubeTrailer(item.title, item.year);
}

function openActiveItemTrailer() {
  if (activeItem) {
    openYouTubeTrailer(activeItem.title, activeItem.year);
  }
}

function openDetailModal(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  activeItem = item;

  toggleDetailEditMode(false);

  document.getElementById("detailTitle").textContent = item.title;
  document.getElementById("detailYearType").textContent = `${item.year || ""} • ${getTypeLabel(item.type)} • ${item.platform}`;
  
  const statusBadge = document.getElementById("detailStatusBadge");
  statusBadge.className = `badge-status ${item.status}`;
  statusBadge.style.position = "static";
  statusBadge.style.marginLeft = "0";
  if (item.status === "watching") statusBadge.textContent = "Kesken";
  else if (item.status === "watchlist") statusBadge.textContent = "Listalla";
  else statusBadge.textContent = "Katsottu";

  const quickActionBox = document.getElementById("detailQuickActionBox");
  if (item.status === "watchlist") {
    quickActionBox.style.display = "block";
  } else {
    quickActionBox.style.display = "none";
  }

  const ratingBox = document.getElementById("detailRatingDisplay");
  if (item.rating && item.rating > 0) {
    ratingBox.textContent = "★".repeat(item.rating) + "☆".repeat(5 - item.rating);
    ratingBox.style.display = "block";
  } else {
    ratingBox.textContent = "Ei arviota";
    ratingBox.style.color = "var(--text-dim)";
  }

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

  document.getElementById("detailSynopsis").textContent = item.synopsis || "Ei kuvausta.";
  document.getElementById("detailCast").textContent = item.cast || "Ei tekijätietoja.";
  document.getElementById("detailCreator").textContent = item.creator || "-";

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

  const posterBox = document.getElementById("detailPosterBox");
  const bgGradient = getTitleGradient(item.title);
  if (item.posterUrl) {
    posterBox.innerHTML = `<img src="${item.posterUrl}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.outerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;background:${bgGradient};font-size:32px;\\'>🎬</div>'">`;
  } else {
    posterBox.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: ${bgGradient}; font-size: 32px;">🎬</div>`;
  }

  const linkBtn = document.getElementById("detailLinkBtn");
  if (item.link) {
    linkBtn.href = item.link;
    linkBtn.style.display = "inline-flex";
  } else {
    linkBtn.style.display = "none";
  }

  if (detailModal) detailModal.classList.add("active");
}

function setWatchingNow() {
  if (!activeItem) return;
  activeItem.status = "watching";
  activeItem.updatedAt = new Date().toISOString().split("T")[0];
  showToast(`▶️ Katson juuri nyt: ${activeItem.title}`);
  saveData();
  openDetailModal(activeItem.id);
}

function cycleActiveItemStatus() {
  if (!activeItem) return;

  if (activeItem.status === "watchlist") {
    activeItem.status = "watching";
    showToast(`Merkitty kesken: ${activeItem.title}`);
  } else if (activeItem.status === "watching") {
    activeItem.status = "completed";
    showToast(`Merkitty katsotuksi: ${activeItem.title}`);
  } else {
    activeItem.status = "watchlist";
    showToast(`Palautettu katselulistalle: ${activeItem.title}`);
  }

  activeItem.updatedAt = new Date().toISOString().split("T")[0];
  saveData();
  openDetailModal(activeItem.id);
}

function toggleDetailEditMode(forceState) {
  const viewContainer = document.getElementById("detailViewContainer");
  const editContainer = document.getElementById("detailEditContainer");
  const titleHeader = document.getElementById("detailSheetTitle");
  const toggleBtn = document.getElementById("detailToggleEditBtn");

  const toEdit = forceState !== undefined ? forceState : (viewContainer.style.display !== "none");

  if (toEdit && activeItem) {
    viewContainer.style.display = "none";
    editContainer.style.display = "flex";
    titleHeader.textContent = "Muokkaa tietoja";
    toggleBtn.style.display = "none";

    document.getElementById("detailEditTitle").value = activeItem.title || "";
    document.getElementById("detailEditYear").value = activeItem.year || "";
    document.getElementById("detailEditType").value = activeItem.type || "series";
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
    viewContainer.style.display = "flex";
    editContainer.style.display = "none";
    titleHeader.textContent = "Tiedot & Tilanne";
    toggleBtn.style.display = "inline-flex";
  }
}

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

function closeModals() {
  if (detailModal) detailModal.classList.remove("active");
  if (addModal) addModal.classList.remove("active");
  if (syncModal) syncModal.classList.remove("active");
  if (randomModal) randomModal.classList.remove("active");
  activeItem = null;
}

function deleteActiveItem() {
  if (!activeItem) return;
  if (confirm(`Haluatko varmasti poistaa nimikkeen "${activeItem.title}"?`)) {
    items = items.filter(i => i.id !== activeItem.id);
    saveData();
    closeModals();
    showToast("Nimike poistettu!");
  }
}

function setupEventListeners() {
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      if (searchClearBtn) searchClearBtn.style.display = searchQuery ? "block" : "none";
      renderView();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      searchQuery = "";
      searchClearBtn.style.display = "none";
      renderView();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      localStorage.setItem(SORT_PREF_KEY, currentSort);
      renderView();
    });
  }

  if (typeFilterSelect) {
    typeFilterSelect.addEventListener("change", (e) => {
      currentType = e.target.value;
      renderView();
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.status;
      renderView();
    });
  });

  chipButtons.forEach(chip => {
    chip.addEventListener("click", () => {
      chipButtons.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentPlatform = chip.dataset.platform;
      renderView();
    });
  });

  [detailModal, addModal, syncModal, randomModal].forEach(m => {
    if (m) {
      m.addEventListener("click", (e) => {
        if (e.target === m) closeModals();
      });
    }
  });

  const autoSearchInput = document.getElementById("autoSearchInput");
  const autoResultsList = document.getElementById("autoResultsList");
  let searchTimeout = null;

  if (autoSearchInput) {
    autoSearchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      clearTimeout(searchTimeout);
      if (q.length < 2) {
        if (autoResultsList) autoResultsList.style.display = "none";
        return;
      }
      searchTimeout = setTimeout(() => {
        searchMoviesAndShows(q);
      }, 350);
    });
  }
}

async function searchMoviesAndShows(query) {
  const autoResultsList = document.getElementById("autoResultsList");
  if (!autoResultsList) return;
  try {
    const omdbPromise = fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=trilogy`)
      .then(r => r.json())
      .catch(() => ({ Response: "False" }));

    const tvmazePromise = fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .catch(() => []);

    const [omdbRes, tvmazeRes] = await Promise.all([omdbPromise, tvmazePromise]);
    const combined = [];

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

    if (Array.isArray(tvmazeRes)) {
      tvmazeRes.slice(0, 4).forEach(t => {
        const show = t.show;
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
      const bgGradient = getTitleGradient(item.title);

      div.innerHTML = `
        ${item.thumb ? `<img src="${item.thumb}" class="search-result-thumb">` : `<div class="search-result-thumb" style="display:flex;align-items:center;justify-content:center;background:${bgGradient}">${typeIcon}</div>`}
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

  if (autoResultsList) autoResultsList.style.display = "none";
  const autoSearchInput = document.getElementById("autoSearchInput");
  if (autoSearchInput) autoSearchInput.value = "";
  showToast(`Valittu: ${item.title}`);
}

function selectTVMazeShow(show) {
  document.getElementById("addTitle").value = show.name;
  document.getElementById("addYear").value = show.premiered ? show.premiered.substring(0, 4) : "";
  document.getElementById("addType").value = "series";
  document.getElementById("addPosterUrl").value = show.image?.original || show.image?.medium || "";
  document.getElementById("addSynopsis").value = show.summary ? show.summary.replace(/<[^>]+>/g, "") : "";
  document.getElementById("addGenres").value = show.genres ? show.genres.join(", ") : "";
  if (show.officialSite) document.getElementById("addLink").value = show.officialSite;

  const net = (show.network?.name || show.webChannel?.name || "").toLowerCase();
  if (net.includes("apple")) document.getElementById("addPlatform").value = "Apple TV+";
  else if (net.includes("netflix")) document.getElementById("addPlatform").value = "Netflix";
  else if (net.includes("prime") || net.includes("amazon")) document.getElementById("addPlatform").value = "Prime Video";
  else if (net.includes("hbo") || net.includes("max")) document.getElementById("addPlatform").value = "HBO Max";
  else if (net.includes("disney")) document.getElementById("addPlatform").value = "Disney+";
}

function submitAddItem(e) {
  e.preventDefault();
  const title = document.getElementById("addTitle").value.trim();
  if (!title) {
    alert("Syötä vähintään nimi!");
    return;
  }

  // DUPLIKAATTIEN ESTO (Sallii kuitenkin ohituksen esim. erikoisversioille)
  const existingDuplicate = items.find(i => i.title.toLowerCase() === title.toLowerCase());
  if (existingDuplicate) {
    let tilaNimi = "Listalla";
    if (existingDuplicate.status === "watching") tilaNimi = "Kesken";
    else if (existingDuplicate.status === "completed") tilaNimi = "Katsottu";

    const isSpecialEdition = confirm(`Nimike "${existingDuplicate.title}" löytyy jo listaltasi (Tila: ${tilaNimi}).\n\nOnko kyseessä erikoisversio (esim. Director's Cut tai uusi kausi) ja haluat varmasti lisätä sen uudelleen?`);
    if (!isSpecialEdition) return; // Keskeytä lisääminen
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
  saveData(); // < Tämä tallentaa ja synkronoi automaattisesti nyt Dropboxiin
  closeModals();
  const form = document.getElementById("addItemForm");
  if (form) form.reset();
  showToast(`Lisätty: ${newItem.title}`);
}

function openAddModal() {
  const form = document.getElementById("addItemForm");
  if (form) form.reset();
  const autoResultsList = document.getElementById("autoResultsList");
  if (autoResultsList) autoResultsList.style.display = "none";
  if (addModal) addModal.classList.add("active");
}

function openSyncModal() {
  const token = localStorage.getItem(DROPBOX_TOKEN_KEY) || "";
  const tokenInput = document.getElementById("dropboxTokenInput");
  if (tokenInput) tokenInput.value = token;
  if (syncModal) syncModal.classList.add("active");
}

function saveDropboxToken() {
  const tokenInput = document.getElementById("dropboxTokenInput");
  if (!tokenInput) return;
  const token = tokenInput.value.trim();
  localStorage.setItem(DROPBOX_TOKEN_KEY, token);
  showToast("Dropbox-avain tallennettu!");
  uploadToDropbox(true); // Koitetaan heti taustalla synkronoida
}

// Upload to Dropbox API (silent = ei häiritseviä ilmoituksia taustasynkronoitaessa)
async function uploadToDropbox(silent = false) {
  const tokenInput = document.getElementById("dropboxTokenInput");
  const token = localStorage.getItem(DROPBOX_TOKEN_KEY) || (tokenInput ? tokenInput.value.trim() : "");
  
  if (!token) {
    if (!silent) alert("Syötä ensin Dropbox Access Token asetuksissa!");
    return;
  }

  if (!silent) showToast("Tallennetaan Dropboxiin...");
  
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
      if (!silent) showToast("✅ Tallennettu Dropboxiin onnistuneesti!");
    } else {
      const err = await res.json();
      console.error("Dropbox error:", err);
      if (!silent) alert("Dropbox-virhe: " + (err.error_summary || "Tarkista token"));
    }
  } catch (e) {
    console.error("Upload error:", e);
    if (!silent) alert("Yhteysvirhe Dropboxiin: " + e.message);
  }
}

async function downloadFromDropbox() {
  const tokenInput = document.getElementById("dropboxTokenInput");
  const token = localStorage.getItem(DROPBOX_TOKEN_KEY) || (tokenInput ? tokenInput.value.trim() : "");
  
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

// Robust CSV parser supporting quotes, commas, and multiline values (RFC 4180)
function parseCSV(text) {
  const rows = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      rows.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    rows.push(row);
  }
  return rows;
}

// Imports an exported IMDb Watchlist (watchlist.csv)
function importIMDbCSVFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const text = evt.target.result;
      const rows = parseCSV(text);
      if (!rows || rows.length < 2) {
        alert("Valittu CSV-tiedosto on tyhjä tai siitä puuttuvat otsikot ja datarivit.");
        e.target.value = "";
        return;
      }

      const headers = rows[0].map(h => (h || "").trim().toLowerCase());
      const constIdx = headers.findIndex(h => h === "const" || h.includes("imdb id") || h === "id");
      const titleIdx = headers.findIndex(h => h === "title" || h === "otsikko");
      const yearIdx = headers.findIndex(h => h === "year" || h === "vuosi");
      const typeIdx = headers.findIndex(h => h === "title type" || h === "type" || h === "tyyppi");
      const genresIdx = headers.findIndex(h => h === "genres" || h === "genre");
      const yourRatingIdx = headers.findIndex(h => h === "your rating" || h === "oma arvio");
      const imdbRatingIdx = headers.findIndex(h => h === "imdb rating" || h === "arvio");
      const directorsIdx = headers.findIndex(h => h === "directors" || h === "director" || h === "ohjaaja");
      const urlIdx = headers.findIndex(h => h === "url" || h === "linkki");
      const descIdx = headers.findIndex(h => h === "description" || h === "kuvaus");

      if (constIdx === -1 && titleIdx === -1) {
        alert("Tiedosto ei vaikuta kelvolliselta IMDb Watchlist -tiedostolta (sarakkeita 'Const' tai 'Title' ei löytynyt).");
        e.target.value = "";
        return;
      }

      // Existing item lookup to prevent duplicates
      const existingIds = new Set();
      const existingKeys = new Set();
      items.forEach(it => {
        if (it.id && it.id.startsWith("tt")) existingIds.add(it.id);
        if (it.link) {
          const m = it.link.match(/tt\d+/);
          if (m) existingIds.add(m[0]);
        }
        if (it.title) {
          const cleanTitle = it.title.trim().toLowerCase();
          const cleanYear = (it.year || "").toString().trim();
          existingKeys.add(`${cleanTitle}_${cleanYear}`);
          existingKeys.add(cleanTitle);
        }
      });

      const newItems = [];
      let dupCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

        const imdbId = constIdx >= 0 && row[constIdx] ? row[constIdx].trim() : "";
        const rawTitle = titleIdx >= 0 && row[titleIdx] ? row[titleIdx].trim() : "";
        if (!rawTitle && !imdbId) continue;

        const yearRaw = yearIdx >= 0 && row[yearIdx] ? row[yearIdx].trim() : "";
        const year = yearRaw.replace(/[^0-9]/g, "").substring(0, 4);

        const cleanTitle = rawTitle.toLowerCase();
        if ((imdbId && existingIds.has(imdbId)) ||
            (cleanTitle && existingKeys.has(`${cleanTitle}_${year}`)) ||
            (cleanTitle && !year && existingKeys.has(cleanTitle))) {
          dupCount++;
          continue;
        }

        const rawType = typeIdx >= 0 && row[typeIdx] ? row[typeIdx].trim().toLowerCase() : "";
        const isSeries = rawType.includes("series") || rawType.includes("tvminiseries") || rawType.includes("show") || rawType.includes("sarja");
        const type = isSeries ? "series" : "movie";

        const rawGenres = genresIdx >= 0 && row[genresIdx] ? row[genresIdx].trim() : "";
        const genres = rawGenres ? rawGenres.split(",").map(g => g.trim()).filter(Boolean) : [];

        const rawYourRating = yourRatingIdx >= 0 && row[yourRatingIdx] ? parseFloat(row[yourRatingIdx]) : NaN;
        const director = directorsIdx >= 0 && row[directorsIdx] ? row[directorsIdx].trim() : "";
        const url = urlIdx >= 0 && row[urlIdx] ? row[urlIdx].trim() : (imdbId ? `https://www.imdb.com/title/${imdbId}/` : "");
        const desc = descIdx >= 0 && row[descIdx] ? row[descIdx].trim() : "";

        const isCompleted = !isNaN(rawYourRating) && rawYourRating > 0;
        const status = isCompleted ? "completed" : "watchlist";
        const rating = isCompleted ? Math.min(5, Math.max(1, Math.round(rawYourRating / 2))) : null;

        let notes = "";
        if (desc) notes = desc;
        if (isCompleted && !isNaN(rawYourRating)) {
          notes = notes ? `${notes} (IMDb-arvio: ${rawYourRating}/10)` : `IMDb-arvio: ${rawYourRating}/10`;
        }

        const newItem = {
          id: imdbId || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: rawTitle || imdbId,
          year: year || "",
          type: type,
          platform: "",
          status: status,
          rating: rating,
          posterUrl: "",
          genres: genres,
          cast: "",
          creator: director,
          synopsis: "",
          link: url,
          notes: notes,
          dateAdded: new Date().toISOString().split("T")[0]
        };

        newItems.push(newItem);
        if (imdbId) existingIds.add(imdbId);
        if (cleanTitle) {
          existingKeys.add(`${cleanTitle}_${year}`);
          existingKeys.add(cleanTitle);
        }
      }

      e.target.value = "";

      if (newItems.length === 0) {
        alert(`Ei uusia nimikkeitä tuotavaksi (${dupCount} nimikettä oli jo katselulistallasi).`);
        return;
      }

      items = newItems.concat(items);
      saveData();
      closeModals();
      showToast(`✅ Tuotu ${newItems.length} nimikettä IMDb:stä! (${dupCount} ohitettiin duplikaattina)`);

      // Enrich missing posters and synopsis in background
      enrichImportedItems(newItems);
    } catch (err) {
      alert("Virhe IMDb CSV -tiedoston käsittelyssä: " + err.message);
      e.target.value = "";
    }
  };
  reader.readAsText(file);
}

// Background enricher for imported IMDb items
async function enrichImportedItems(newItems) {
  const toEnrich = newItems.filter(it => !it.posterUrl || !it.synopsis);
  if (!toEnrich || toEnrich.length === 0) return;

  let enrichedCount = 0;
  for (const item of toEnrich) {
    const imdbMatch = (item.id && item.id.startsWith("tt")) ? item.id : (item.link ? item.link.match(/tt\d+/) : null);
    const imdbId = Array.isArray(imdbMatch) ? imdbMatch[0] : imdbMatch;

    if (imdbId) {
      try {
        const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=trilogy`);
        const d = await res.json();
        if (d && d.Response === "True") {
          let updated = false;
          if (!item.posterUrl && d.Poster && d.Poster !== "N/A") {
            item.posterUrl = d.Poster;
            updated = true;
          }
          if (!item.synopsis && d.Plot && d.Plot !== "N/A") {
            item.synopsis = d.Plot;
            updated = true;
          }
          if (!item.cast && d.Actors && d.Actors !== "N/A") {
            item.cast = d.Actors;
            updated = true;
          }
          if (!item.creator && d.Director && d.Director !== "N/A") {
            item.creator = d.Director;
            updated = true;
          }
          if ((!item.genres || item.genres.length === 0) && d.Genre && d.Genre !== "N/A") {
            item.genres = d.Genre.split(",").map(s => s.trim()).filter(Boolean);
            updated = true;
          }
          if (updated) {
            enrichedCount++;
            if (enrichedCount % 4 === 0) {
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
                renderFilters();
                renderView();
              } catch (e) {}
            }
          }
        }
      } catch (e) {
        // Continue politely
      }
      await new Promise(r => setTimeout(r, 220));
    }
  }

  if (enrichedCount > 0) {
    saveData();
    showToast(`🎨 ${enrichedCount} nimikkeen kansikuva ja tiedot rikastettu!`);
  }
}

function exportToObsidianMarkdown() {
  let md = "---\nname: Katselulista\ntags:\n  - katselulista\n  - leffat\n  - sarjat\nupdated: " + new Date().toISOString().split("T")[0] + "\n---\n\n";
  md += "# 🎬 Katselulista – Leffat & Sarjat\n\n";

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

async function syncWithLocalServer() {
  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items)
    });
  } catch (e) {}
}

function showToast(text) {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

window.addEventListener("DOMContentLoaded", initApp);
