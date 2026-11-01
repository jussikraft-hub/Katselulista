/**
 * Katselulista – Mobile/iPad Web App Engine
 * Ominaisuudet: Lajittelu, tyyppisuodatus, haku, alustasuodatus, satunnaisvalinta, lista-/korttinäkymä
 * Lisäykset: Dynaamiset taustavärit puuttuville kansikuville, älykäs duplikaattien esto, 
 *            automaattinen Dropbox-synkka ja "Katson juuri nyt" pikatoiminto.
 */

// Initial Seed Data (Curated items matching katselulista.json)
const DEFAULT_ITEMS = [
  {
    id: "item-1793482229853",
    title: "Breaking Bad",
    originalTitle: "Breaking Bad",
    type: "series",
    year: "2008",
    platform: "Netflix",
    status: "completed",
    progress: "Kaikki 5 kautta katsottu",
    posterUrl: "https://static.tvmaze.com/uploads/images/original_untouched/501/1253519.jpg",
    genres: ["Draama", "Rikos", "Trilleri"],
    cast: "Bryan Cranston, Aaron Paul, Anna Gunn, Dean Norris, Giancarlo Esposito",
    creator: "Vince Gilligan",
    synopsis: "Kemianopettaja Walter White saa kuulla sairastavansa parantumatonta syöpää ja päättää ryhtyä valmistamaan metamfetamiinia taatakseen perheensä taloudellisen tulevaisuuden.",
    notes: "Mestariteos. Täydellinen draaman kaari.",
    rating: 5,
    link: "http://www.amc.com/shows/breaking-bad",
    updatedAt: "2026-10-31"
  },
  {
    id: "sugar-2024",
    title: "Sugar",
    originalTitle: "Sugar",
    type: "series",
    year: "2024",
    platform: "Apple TV+",
    status: "watching",
    progress: "Kausi 1 kesken (8 jaksoa)",
    posterUrl: "https://static.tvmaze.com/uploads/images/original_untouched/629/1574176.jpg",
    genres: ["Neo-noir", "Rikos", "Mysteeri", "Draama"],
    cast: "Colin Farrell, Amy Ryan, James Cromwell, Kirby Howell-Baptiste",
    creator: "Mark Protosevich",
    synopsis: "Los Angelesiin sijoittuva tyylikäs neo-noir-etsivätarina, jossa vanhan Hollywoodin elokuvaviittaukset yhdistyvät arvoitukselliseen katoamistapaukseen ja odottamattomaan mysteeriin.",
    notes: "Colin Farrell pääosassa yksityisetsivä John Sugarina.",
    rating: 4,
    link: "https://tv.apple.com",
    updatedAt: "2026-10-31"
  },
  {
    id: "silo-2023",
    title: "Siilo (Silo)",
    originalTitle: "Silo",
    type: "series",
    year: "2023",
    platform: "Apple TV+",
    status: "watching",
    progress: "Kausi 1 & 2",
    posterUrl: "https://static.tvmaze.com/uploads/images/original_untouched/631/1577677.jpg",
    genres: ["Scifi", "Dystopia", "Mysteeri", "Draama"],
    cast: "Rebecca Ferguson, Tim Robbins, Common, Harriet Walter",
    creator: "Graham Yost (Hugh Howeyn Wool-kirjat)",
    synopsis: "Maanalaiseen 144-kerroksiseen siiloon eristäytynyt yhteisö. Kuka rakensi siilon, miksi ulkomaailma on tuhoutunut ja mitä salaisuuksia siilon säännöt piilottelevat?",
    notes: "Hugh Howeyn kirjatrilogian upea sovitus.",
    rating: 5,
    link: "https://tv.apple.com",
    updatedAt: "2026-10-31"
  },
  {
    id: "fallout-2024",
    title: "Fallout",
    originalTitle: "Fallout",
    type: "series",
    year: "2024",
    platform: "Prime Video",
    status: "watching",
    progress: "1. kausi katsottu (odottaa Kautta 2)",
    posterUrl: "https://static.tvmaze.com/uploads/images/original_untouched/599/1499142.jpg",
    genres: ["Scifi", "Post-apokalypsi", "Musta komedia", "Toiminta"],
    cast: "Ella Purnell, Walton Goggins, Aaron Moten, Kyle MacLachlan",
    creator: "Graham Wagner, Geneva Robertson-Dworet (Jonathan Nolan & Lisa Joy)",
    synopsis: "Ydintuhon jälkeinen autiomaa ja Holvi 33. Yhteiskunnan luokkaerot, musta huumori ja armoton selviytymistaistelu kohtaavat kulttipelisarjan maailmassa.",
    notes: "Kausi 1 katsottu. Jäänyt odottamaan 2. kautta (New Vegas).",
    rating: 5,
    link: "https://www.primevideo.com",
    updatedAt: "2026-10-31"
  }
];

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

// Elements
const cardsGrid = document.getElementById("cardsGrid");
const cardsList = document.getElementById("cardsList");
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
  renderFilters();
  renderView();
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

// Load data from localStorage
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed;
      } else {
        items = [...DEFAULT_ITEMS];
        saveData();
      }
    } else {
      items = [...DEFAULT_ITEMS];
      saveData();
    }
  } catch (e) {
    console.error("Virhe ladattaessa muistista:", e);
    items = [...DEFAULT_ITEMS];
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

  document.getElementById("countAll").textContent = counts.all;
  document.getElementById("countWatching").textContent = counts.watching;
  document.getElementById("countWatchlist").textContent = counts.watchlist;
  document.getElementById("countCompleted").textContent = counts.completed;

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

  if (currentView === "list") {
    cardsGrid.style.display = "none";
    cardsList.style.display = "flex";
    if (gridBtn) gridBtn.classList.remove("active");
    if (listBtn) listBtn.classList.add("active");
    renderCompactList(filtered);
  } else {
    cardsGrid.style.display = "grid";
    cardsList.style.display = "none";
    if (gridBtn) gridBtn.classList.add("active");
    if (listBtn) listBtn.classList.remove("active");
    renderCards(filtered);
  }
}

// Render cards (Grid View)
function renderCards(filtered) {
  cardsGrid.innerHTML = "";

  if (filtered.length === 0) {
    cardsGrid.innerHTML = `
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
        ${ratingStars ? `<div class="card-rating">${ratingStars}</div>` : ""}
      </div>
    `;

    cardsGrid.appendChild(card);
  });
}

// Render Compact List View
function renderCompactList(filtered) {
  cardsList.innerHTML = "";

  if (filtered.length === 0) {
    cardsList.innerHTML = `
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
        <div class="badge-platform ${platformClass}" style="position: static; font-size: 9px; padding: 2px 6px;">${item.platform || "Muu"}</div>
        <div class="badge-status ${item.status}" style="position: static; font-size: 9px; padding: 2px 6px;">${statusLabel}</div>
        ${ratingStars ? `<div style="font-size: 10px; color: var(--gold);">${ratingStars}</div>` : ""}
      </div>
    `;

    cardsList.appendChild(row);
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

  randomModal.classList.add("active");
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

  // Näytä iso "Katson juuri nyt" -nappi vain jos nimike on 'watchlist'
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

  detailModal.classList.add("active");
}

// "Aloita katselu" pikatoiminto
function setWatchingNow() {
  if (!activeItem) return;
  activeItem.status = "watching";
  activeItem.updatedAt = new Date().toISOString().split("T")[0];
  showToast(`▶️ Katson juuri nyt: ${activeItem.title}`);
  saveData();
  openDetailModal(activeItem.id);
}

// Cycle status
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
  detailModal.classList.remove("active");
  addModal.classList.remove("active");
  syncModal.classList.remove("active");
  randomModal.classList.remove("active");
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
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    searchClearBtn.style.display = searchQuery ? "block" : "none";
    renderView();
  });

  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    searchClearBtn.style.display = "none";
    renderView();
  });

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
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModals();
    });
  });

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

async function searchMoviesAndShows(query) {
  const autoResultsList = document.getElementById("autoResultsList");
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

  autoResultsList.style.display = "none";
  document.getElementById("autoSearchInput").value = "";
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
  document.getElementById("addItemForm").reset();
  showToast(`Lisätty: ${newItem.title}`);
}

function openAddModal() {
  document.getElementById("addItemForm").reset();
  document.getElementById("autoResultsList").style.display = "none";
  addModal.classList.add("active");
}

function openSyncModal() {
  const token = localStorage.getItem(DROPBOX_TOKEN_KEY) || "";
  document.getElementById("dropboxTokenInput").value = token;
  syncModal.classList.add("active");
}

function saveDropboxToken() {
  const token = document.getElementById("dropboxTokenInput").value.trim();
  localStorage.setItem(DROPBOX_TOKEN_KEY, token);
  showToast("Dropbox-avain tallennettu!");
  uploadToDropbox(true); // Koitetaan heti taustalla synkronoida
}

// Upload to Dropbox API (silent = ei häiritseviä ilmoituksia taustasynkronoitaessa)
async function uploadToDropbox(silent = false) {
  const token = localStorage.getItem(DROPBOX_TOKEN_KEY) || (document.getElementById("dropboxTokenInput") ? document.getElementById("dropboxTokenInput").value.trim() : "");
  
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
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

window.addEventListener("DOMContentLoaded", initApp);
