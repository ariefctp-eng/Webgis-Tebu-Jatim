// Map Initialization
const map = L.map('map').setView([-7.7, 112.5], 8);

// Drawing Layer
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polyline: false,
        circle: false,
        rectangle: false,
        circlemarker: false
    }
});
// Note: We don't add drawControl to map because we use custom buttons

// Basemaps
const basemaps = {
    'esri': L.layerGroup([
        L.esri.basemapLayer('Imagery'),
        L.esri.basemapLayer('ImageryLabels')
    ]),
    'osm': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    })
};

// Add default basemap
basemaps.esri.addTo(map);

function switchBasemap(type) {
    // Remove all current basemaps
    for (let b in basemaps) {
        map.removeLayer(basemaps[b]);
    }

    // Add selected
    basemaps[type].addTo(map);

    // Update UI (Map Floating Controls)
    document.querySelectorAll('.basemap-option').forEach(el => el.classList.remove('active'));
    const options = document.querySelectorAll('.basemap-option');
    if (type === 'esri') options[0].classList.add('active');
    else if (type === 'osm') options[1].classList.add('active');

    // Close menu after selection
    document.getElementById('basemapMenu').classList.remove('show');
}

// Coordinate Display Logic (UTM WGS 84)
map.on('mousemove', (e) => {
    const coordsVal = document.getElementById('coords-val');
    if (coordsVal) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // Determine UTM Zone
        const zone = Math.floor((lng + 180) / 6) + 1;
        const hemisphere = lat < 0 ? 'S' : 'N';
        const utmZone = `${zone}${hemisphere}`;

        // Define Projection String
        const utmProj = `+proj=utm +zone=${zone} ${lat < 0 ? '+south' : ''} +datum=WGS84 +units=m +no_defs`;

        // Convert [lng, lat] to UTM [x, y]
        const utmCoords = proj4('WGS84', utmProj, [lng, lat]);

        const easting = utmCoords[0].toFixed(0);
        const northing = utmCoords[1].toFixed(0);

        coordsVal.innerText = `${utmZone} | E: ${easting} m, N: ${northing} m`;

        // Update DMS Display
        const dmsVal = document.getElementById('dms-val');
        if (dmsVal) {
            dmsVal.innerText = `${toDMS(lat, 'lat')}, ${toDMS(lng, 'lng')}`;
        }
    }
    updateScale();
});

// Helper: Decimal to DMS
function toDMS(deg, type) {
    const absolute = Math.abs(deg);
    const d = Math.floor(absolute);
    const m = Math.floor((absolute - d) * 60);
    const s = ((absolute - d - m / 60) * 3600).toFixed(2);

    let direction = "";
    if (type === 'lat') {
        direction = deg >= 0 ? "N" : "S";
    } else {
        direction = deg >= 0 ? "E" : "W";
    }

    return `${d}° ${m}' ${s}" ${direction}`;
}

// Scale Calculation Logic
function updateScale() {
    const scaleVal = document.getElementById('scale-val');
    if (!scaleVal) return;

    const center = map.getCenter();
    const zoom = map.getZoom();

    // meters per pixel
    const latRad = center.lat * Math.PI / 180;
    const metersPerPixel = (40075016.686 * Math.cos(latRad)) / Math.pow(2, zoom + 8);

    // 1 pixel is approx 0.000264583 meters (at 96 DPI)
    const scaleFactor = Math.round(metersPerPixel / 0.000264583);

    // Round to nearest logical scale (optional, but requested "perribuan")
    // If you want exact, just use scaleFactor. If you want "perribuan", maybe round to 100 or 1000.
    // Let's use exact for accuracy, or round to 100 for cleanliness.
    const displayScale = Math.round(scaleFactor / 100) * 100;

    scaleVal.innerText = `1:${displayScale.toLocaleString('id-ID')}`;
}

map.on('zoomend', updateScale);
map.on('moveend', updateScale);

// Layer State
const layers = {
    'tebu_eksisting': {
        name: 'Tebu Eksisting Jatim',
        path: 'data/tebu_eksisting_jatim.geojson',
        color: '#4caf50',
        active: false,
        instance: null,
        data: null,
        popupField: 'KABKOT'
    },
    'tebu_potensi': {
        name: 'Tebu Potensi Jatim',
        isParent: true,
        children: ['tebu_potensi_hp', 'tebu_potensi_apl']
    },
    'tebu_potensi_hp': {
        name: 'HP (Hutan Produksi)',
        path: 'data/tebu_potensi_jatim.geojson',
        color: '#ff9800',
        active: false,
        instance: null,
        data: null,
        filter: (f) => f.properties.KWS2022 === 'HP',
        popupField: 'KABKOT'
    },
    'tebu_potensi_apl': {
        name: 'APL (Areal Penggunaan Lain)',
        path: 'data/tebu_potensi_jatim.geojson',
        color: '#fdd835',
        active: false,
        instance: null,
        data: null,
        filter: (f) => f.properties.KWS2022 === 'APL',
        popupField: 'KABKOT'
    },
    'kesesuaian_lahan': {
        name: 'Kesesuaian Lahan Tebu',
        isParent: true,
        children: ['kesesuaian_s1', 'kesesuaian_s2', 'kesesuaian_s3', 'kesesuaian_n']
    },
    'kesesuaian_s1': {
        name: 'S1 - Sangat Sesuai',
        path: 'data/kesesuaian_lahan_tebu_jatim.geojson',
        color: '#cc53d1',
        active: false,
        instance: null,
        data: null,
        filter: (f) => f.properties.KTB_24 === 'S1',
        popupField: 'KABKOT'
    },
    'kesesuaian_s2': {
        name: 'S2 - Cukup Sesuai',
        path: 'data/kesesuaian_lahan_tebu_jatim.geojson',
        color: '#eb4b73',
        active: false,
        instance: null,
        data: null,
        filter: (f) => f.properties.KTB_24 === 'S2',
        popupField: 'KABKOT'
    },
    'kesesuaian_s3': {
        name: 'S3 - Sesuai Marjinal',
        path: 'data/kesesuaian_lahan_tebu_jatim.geojson',
        color: '#4b40eb',
        active: false,
        instance: null,
        data: null,
        filter: (f) => f.properties.KTB_24 === 'S3',
        popupField: 'KABKOT'
    },
    'kesesuaian_n': {
        name: 'N - Tidak Sesuai',
        path: 'data/kesesuaian_lahan_tebu_jatim.geojson',
        color: '#a6cee3',
        active: false,
        instance: null,
        data: null,
        filter: (f) => f.properties.KTB_24 === 'N',
        popupField: 'KABKOT'
    },
    'provinsi_jatim': {
        name: 'Batas Provinsi Jatim',
        path: 'data/batas_provinsi_jatim.geojson',
        color: '#ff9800',
        active: false,
        instance: null,
        data: null,
        style: {
            color: '#ff9800',
            weight: 3,
            fillOpacity: 0
        },
        popupField: 'KABUPATEN',
        showOnlyFields: ['KABUPATEN']
    }
};

// Loader Toggle
function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// Load GeoJSON Function
async function loadLayerData(layerKey) {
    const layer = layers[layerKey];
    if (layer.instance) return layer.instance;

    toggleLoader(true);
    try {
        // Fetch GeoJSON data if not already loaded for this path
        if (!layer.data) {
            const response = await fetch(layer.path);
            if (!response.ok) throw new Error(`File GeoJSON tidak ditemukan: ${response.statusText}`);
            layer.data = await response.json();
        }

        // Apply filter if exists
        let filteredGeojson = layer.data;
        if (layer.filter) {
            filteredGeojson = {
                ...layer.data,
                features: layer.data.features.filter(layer.filter)
            };
        }

        // Create Leaflet layer
        layer.instance = L.geoJSON(filteredGeojson, {
            style: typeof layer.style === 'function' ? layer.style : (layer.style || {
                color: layer.color,
                weight: 2,
                fillOpacity: 0.4
            }),
            onEachFeature: (feature, leafletLayer) => {
                let popupContent = `<div class="leaflet-popup-header">${layer.name}</div><div class="popup-body">`;

                // Intelligent Attribute Display
                const props = feature.properties;
                const displayFields = {
                    'KABKOT': 'Kabupaten/Kota',
                    'NAMOBJ': 'Nama Objek',
                    'WADMPR': 'Provinsi',
                    'LUAS_CEA': 'Luas (Ha)',
                    'KET': 'Keterangan',
                    'KET TEBU': 'Keterangan Tebu',
                    'KWS2022': 'Kawasan',
                    'POLA': 'Pola Ruang',
                    'KTB_24': 'Kesesuaian Tebu',
                    'KABUPATEN': 'Kabupaten'
                };

                let hasData = false;
                const fieldsToDisplay = layer.showOnlyFields || Object.keys(displayFields);

                for (let field of fieldsToDisplay) {
                    if (props[field] !== undefined && props[field] !== null && displayFields[field]) {
                        popupContent += `<strong>${displayFields[field]}:</strong> ${props[field]}<br>`;
                        hasData = true;
                    }
                }

                if (!hasData) {
                    for (let key in props) {
                        popupContent += `<strong>${key}:</strong> ${props[key]}<br>`;
                    }
                }

                popupContent += `</div>`;
                leafletLayer.bindPopup(popupContent);
            }
        });

        return layer.instance;
    } catch (error) {
        console.error(`Error loading ${layer.name}:`, error);
        alert(`Gagal memuat layer ${layer.name}: ${error.message}`);
    } finally {
        toggleLoader(false);
    }
}

// Initialize Layer List in Sidebar
function initLayerList() {
    const list = document.getElementById('layerList');
    if (!list) return;

    for (let key in layers) {
        const layer = layers[key];
        if (layer.isParent) {
            // Render Parent Title
            const parentDiv = document.createElement('div');
            parentDiv.className = 'layer-group';
            // Default to expanded, but add a toggle icon
            parentDiv.innerHTML = `
                <div class="layer-parent-header" id="parent-${key}">
                    <span class="layer-parent-name">${layer.name}</span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </div>
            `;

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'layer-children';
            childrenContainer.id = `children-${key}`;

            layer.children.forEach(childKey => {
                const childItem = createLayerItem(childKey);
                childrenContainer.appendChild(childItem);
            });

            // Toggle Logic
            const header = parentDiv.querySelector('.layer-parent-header');
            header.onclick = () => {
                const isCollapsed = childrenContainer.classList.toggle('collapsed');
                const icon = header.querySelector('.toggle-icon');
                if (isCollapsed) {
                    icon.className = 'fas fa-chevron-right toggle-icon';
                } else {
                    icon.className = 'fas fa-chevron-down toggle-icon';
                }
            };

            parentDiv.appendChild(childrenContainer);
            list.appendChild(parentDiv);
        } else if (!isAChild(key)) {
            // Render Normal Layer
            list.appendChild(createLayerItem(key));
        }
    }
}

function isAChild(key) {
    for (let k in layers) {
        if (layers[k].children && layers[k].children.includes(key)) return true;
    }
    return false;
}

function createLayerItem(key) {
    const layer = layers[key];
    const item = document.createElement('div');
    item.className = 'layer-item';

    // Add legend color indicator if exists
    const legendHtml = layer.color ? `<div class="layer-legend" style="background-color: ${layer.color}"></div>` : '';

    item.innerHTML = `
        <div class="layer-toggle" id="toggle-${key}"></div>
        <span class="layer-name">${layer.name}</span>
        ${legendHtml}
    `;

    item.onclick = async () => {
        const toggle = document.getElementById(`toggle-${key}`);

        if (layer.active) {
            if (layer.instance) map.removeLayer(layer.instance);
            layer.active = false;
            toggle.classList.remove('on');
            item.classList.remove('active');
        } else {
            const leafletLayer = await loadLayerData(key);
            if (leafletLayer) {
                leafletLayer.addTo(map);
                if (key === 'provinsi_jatim') {
                    leafletLayer.bringToBack();
                }
                layer.active = true;
                toggle.classList.add('on');
                item.classList.add('active');

                if (Object.values(layers).filter(l => l.active).length === 1) {
                    map.fitBounds(leafletLayer.getBounds());
                }
            }
        }
    };
    return item;
}

// Search Index
let searchIndex = [];

// Pre-index attributes from GeoJSON files for fast global search
async function indexAttributes() {
    console.log("Indexing attributes for search...");
    const uniquePaths = {};

    // Group layers by their data path
    for (let key in layers) {
        const layer = layers[key];
        if (layer.isParent || !layer.path) continue;
        if (!uniquePaths[layer.path]) uniquePaths[layer.path] = [];
        uniquePaths[layer.path].push(key);
    }

    const indexingPromises = Object.keys(uniquePaths).map(async (path) => {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error("GeoJSON not found");
            const data = await response.json();

            data.features.forEach((feature, index) => {
                const props = feature.properties;

                // For each layer that uses this path, check if this feature belongs to it
                uniquePaths[path].forEach(key => {
                    const layer = layers[key];
                    if (layer.filter && !layer.filter(feature)) return;

                    // Add to search index
                    searchIndex.push({
                        layerKey: key,
                        featureIndex: index,
                        properties: props,
                        label: props['KABKOT'] || props['NAMOBJ'] || props['KABUPATEN'] || props['NAME'] || props['Kecamatan'] || props['Desa'] || Object.values(props)[0]
                    });
                });
            });
        } catch (e) {
            console.warn(`Could not index path ${path}:`, e.message);
        }
    });

    await Promise.all(indexingPromises);
    console.log(`Indexed ${searchIndex.length} features.`);
}

// Search Functionality
function setupSearch() {
    const input = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');
    const btn = document.getElementById('searchBtn');

    if (!input || !resultsContainer || !btn) return;

    const handleSearch = () => {
        const query = input.value.toLowerCase().trim();
        resultsContainer.innerHTML = '';

        if (query.length < 2) return;

        // Support multiple terms (AND search)
        const terms = query.split(/\s+/);

        const matches = searchIndex.filter(item => {
            const rowString = Object.values(item.properties).join(' ').toLowerCase();
            return terms.every(term => rowString.includes(term));
        });

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="search-item">Tidak ditemukan hasil.</div>';
        } else {
            // Show result count
            const countDiv = document.createElement('div');
            countDiv.className = 'search-count';
            countDiv.innerHTML = `Ditemukan <strong>${matches.length}</strong> hasil`;
            resultsContainer.appendChild(countDiv);

            // Group by layer for better display
            const grouped = {};
            matches.slice(0, 100).forEach(match => {
                if (!grouped[match.layerKey]) grouped[match.layerKey] = [];
                grouped[match.layerKey].push(match);
            });

            for (let layerKey in grouped) {
                const layerHeader = document.createElement('div');
                layerHeader.className = 'search-group-header';
                const layerMatches = grouped[layerKey].length;
                layerHeader.innerText = `${layers[layerKey].name} (${layerMatches})`;
                resultsContainer.appendChild(layerHeader);

                grouped[layerKey].forEach(match => {
                    const div = document.createElement('div');
                    div.className = 'search-item';
                    div.innerHTML = `<strong>${match.label}</strong>`;
                    div.onclick = async () => {
                        const layer = layers[match.layerKey];

                        // 1. Ensure layer is loaded and active
                        if (!layer.active) {
                            const toggleId = `toggle-${match.layerKey}`;
                            const toggleEl = document.getElementById(toggleId);
                            if (toggleEl) {
                                // Simulate click to trigger activation logic
                                toggleEl.parentElement.click();
                            }

                            // Wait for layer to load
                            toggleLoader(true);
                            let attempts = 0;
                            while (!layer.instance && attempts < 50) {
                                await new Promise(r => setTimeout(r, 100));
                                attempts++;
                            }
                            toggleLoader(false);
                        }

                        // 2. Zoom to feature
                        if (layer.instance) {
                            let found = false;
                            layer.instance.eachLayer(l => {
                                if (found) return;
                                // Robust property comparison
                                const isMatch = Object.keys(match.properties).every(pk =>
                                    String(l.feature.properties[pk]) === String(match.properties[pk])
                                );
                                if (isMatch) {
                                    if (l.getBounds) map.fitBounds(l.getBounds());
                                    else if (l.getLatLng) map.setView(l.getLatLng(), 15);
                                    l.openPopup();
                                    found = true;
                                }
                            });
                        }
                    };
                    resultsContainer.appendChild(div);
                });
            }
        }
    };

    input.oninput = () => {
        if (input.value.trim() === '') {
            resultsContainer.innerHTML = '';
        }
    };
    input.onkeyup = (e) => { if (e.key === 'Enter') handleSearch(); };
    btn.onclick = handleSearch;
}

// Locate Me Logic
function locateMe() {
    map.locate({ setView: true, maxZoom: 16, watch: true });
}

function goHome() {
    map.setView([-2.5, 118.0], 5);
}

// Drawing Functions
let activeDrawHandler = null;

function startDraw(type) {
    if (activeDrawHandler) {
        activeDrawHandler.disable();
    }

    if (type === 'marker') {
        activeDrawHandler = new L.Draw.Marker(map, drawControl.options.draw.marker);
    } else if (type === 'polygon') {
        activeDrawHandler = new L.Draw.Polygon(map, drawControl.options.draw.polygon);
    }

    if (activeDrawHandler) {
        activeDrawHandler.enable();
        // Visual feedback
        document.getElementById('drawMarkerBtn').classList.toggle('active', type === 'marker');
        document.getElementById('drawPolygonBtn').classList.toggle('active', type === 'polygon');
    }
}

map.on(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;

    // Prompt for title
    const title = prompt("Masukkan Judul/Keterangan untuk objek ini:", "Objek Baru");
    if (title !== null) {
        layer.feature = layer.feature || { type: "Feature", properties: {} };
        layer.feature.properties.title = title;
        bindDrawPopup(layer);
    }

    drawnItems.addLayer(layer);
    saveToLocalStorage();

    // Show save, clear, and edit buttons if there are items
    document.getElementById('saveDrawBtn').style.display = 'flex';
    document.getElementById('clearDrawBtn').style.display = 'flex';
    document.getElementById('editDrawBtn').style.display = 'flex';

    // Reset buttons
    document.getElementById('drawMarkerBtn').classList.remove('active');
    document.getElementById('drawPolygonBtn').classList.remove('active');
    activeDrawHandler = null;
});

function saveDrawnData() {
    if (drawnItems.getLayers().length === 0) {
        alert("Tidak ada data untuk disimpan.");
        return;
    }

    const data = drawnItems.toGeoJSON();

    // Use title of the first feature as filename if available
    let fileName = `hasil_gambar_${new Date().getTime()}.geojson`;
    if (data.features.length > 0 && data.features[0].properties.title) {
        const cleanTitle = data.features[0].properties.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        fileName = `${cleanTitle}.geojson`;
    }

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Data telah disiapkan sebagai ${fileName}. Silakan simpan ke folder data/ di folder proyek Anda.`);
}

function clearDrawnData() {
    if (drawnItems.getLayers().length === 0) return;

    if (confirm("Apakah Anda yakin ingin menghapus semua hasil gambar di peta?")) {
        drawnItems.clearLayers();
        saveToLocalStorage();
        document.getElementById('saveDrawBtn').style.display = 'none';
        document.getElementById('clearDrawBtn').style.display = 'none';
        document.getElementById('editDrawBtn').style.display = 'none';
        if (editHandler) {
            editHandler.disable();
            document.getElementById('editDrawBtn').classList.remove('active');
        }
    }
}

// Local Storage Persistence
function saveToLocalStorage() {
    const data = drawnItems.toGeoJSON();
    localStorage.setItem('drawn_features', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('drawn_features');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            L.geoJSON(data, {
                onEachFeature: (feature, layer) => {
                    layer.feature = feature;
                    bindDrawPopup(layer);
                    drawnItems.addLayer(layer);
                }
            });

            if (drawnItems.getLayers().length > 0) {
                document.getElementById('saveDrawBtn').style.display = 'flex';
                document.getElementById('clearDrawBtn').style.display = 'flex';
                document.getElementById('editDrawBtn').style.display = 'flex';
            }
        } catch (e) {
            console.error("Gagal memuat data tersimpan:", e);
        }
    }
}

let editHandler = null;
function toggleEdit() {
    if (drawnItems.getLayers().length === 0) return;

    if (!editHandler) {
        editHandler = new L.EditToolbar.Edit(map, {
            featureGroup: drawnItems
        });
    }

    const btn = document.getElementById('editDrawBtn');
    if (btn.classList.contains('active')) {
        editHandler.save();
        editHandler.disable();
        btn.classList.remove('active');
        saveToLocalStorage();
    } else {
        editHandler.enable();
        btn.classList.add('active');
    }
}

function bindDrawPopup(layer) {
    const title = layer.feature.properties.title || "Tanpa Judul";
    const content = `
        <div class="leaflet-popup-header">Info Objek Gambar</div>
        <div class="popup-body">
            <strong>Title:</strong> ${title}<br>
            <button onclick="editAttributes('${L.stamp(layer)}')" style="margin-top:10px; padding:5px 10px; cursor:pointer; background:var(--primary-color); color:white; border:none; border-radius:4px; font-size:0.75rem;">
                <i class="fas fa-edit"></i> Edit Title
            </button>
        </div>
    `;
    layer.bindPopup(content);
}

function editAttributes(layerId) {
    const layer = drawnItems.getLayer(layerId);
    if (!layer) return;

    const oldTitle = layer.feature.properties.title;
    const newTitle = prompt("Ubah Judul/Keterangan:", oldTitle);

    if (newTitle !== null) {
        layer.feature.properties.title = newTitle;
        bindDrawPopup(layer);
        layer.openPopup();
        saveToLocalStorage();
    }
}

let userMarker = null;
let userAccuracyCircle = null;

map.on('locationfound', (e) => {
    const radius = e.accuracy / 2;

    const locationIcon = L.divIcon({
        className: 'user-location-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    if (userMarker) {
        userMarker.setLatLng(e.latlng);
        userAccuracyCircle.setLatLng(e.latlng);
        userAccuracyCircle.setRadius(radius);
    } else {
        userMarker = L.marker(e.latlng, { icon: locationIcon }).addTo(map)
            .bindPopup(`Anda berada dalam radius ${radius.toFixed(0)} meter dari titik ini`);
        userAccuracyCircle = L.circle(e.latlng, radius, {
            color: '#2196f3',
            fillColor: '#2196f3',
            fillOpacity: 0.15,
            weight: 1
        }).addTo(map);
    }

    // Auto-center only on first found or if close to edge
    // map.setView(e.latlng); 
});

map.on('locationerror', (e) => {
    alert("Gagal mendapatkan lokasi: " + e.message);
});

// Start
document.addEventListener('DOMContentLoaded', () => {
    initLayerList();
    setupSearch();
    indexAttributes(); // Start indexing in background
    toggleLoader(false);
    updateScale();
    loadFromLocalStorage();

    // Basemap Menu Toggle
    const basemapBtn = document.getElementById('basemapBtn');
    const basemapMenu = document.getElementById('basemapMenu');
    if (basemapBtn && basemapMenu) {
        basemapBtn.onclick = (e) => {
            e.stopPropagation();
            basemapMenu.classList.toggle('show');
        };

        document.addEventListener('click', () => {
            basemapMenu.classList.remove('show');
        });

        basemapMenu.onclick = (e) => e.stopPropagation();
    }

    // Excel Menu Toggle
    const excelBtn = document.getElementById('excelBtn');
    const excelMenu = document.getElementById('excelMenu');
    if (excelBtn && excelMenu) {
        excelBtn.onclick = (e) => {
            e.stopPropagation();
            excelMenu.classList.toggle('show');
            if (basemapMenu) basemapMenu.classList.remove('show');
        };

        document.addEventListener('click', () => {
            excelMenu.classList.remove('show');
        });

        excelMenu.onclick = (e) => e.stopPropagation();
    }
});

// Excel Preview Logic
async function previewExcel(filePath, title) {
    const modal = document.getElementById('previewModal');
    const body = document.getElementById('previewBody');
    const titleEl = document.getElementById('previewTitle');

    if (!modal || !body || !titleEl) return;

    // Show modal and loading state
    titleEl.innerText = `Preview: ${title}`;
    body.innerHTML = '<div class="preview-placeholder"><div class="loader"></div>&nbsp;&nbsp;Memuat data...</div>';
    modal.style.display = 'block';

    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('File tidak ditemukan');

        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        // Parse workbook
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to HTML table
        const html = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-preview-table', editable: false });

        body.innerHTML = html;
    } catch (error) {
        console.error('Error previewing Excel:', error);
        body.innerHTML = `<div class="preview-placeholder" style="color: #f44336;">Gagal memuat preview: ${error.message}</div>`;
    }
}

function closePreview() {
    const modal = document.getElementById('previewModal');
    if (modal) modal.style.display = 'none';
}

// Close modal when clicking outside or pressing ESC
window.onclick = function (event) {
    const modal = document.getElementById('previewModal');
    if (event.target == modal) {
        closePreview();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
});
