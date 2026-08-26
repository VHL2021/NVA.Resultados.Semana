const CONFIG_AREA = { homeLeft: 4, homeWidth: 21, awayLeft: 30, awayWidth: 21, height: 28, bottomOffset: 16 };

let EQUIPOS_NVA_DATA = [
    { LOGO: null, EQUIPO: "ALEVIN", CATEGORIA: "ALEVIN", COLOR: "008de9" },
    { LOGO: null, EQUIPO: "ENOVA NVA", CATEGORIA: "INFANTIL 2ª DIVISION", COLOR: "dc6600" },
    { LOGO: null, EQUIPO: "UP! SCHOOL NVA", CATEGORIA: "INFANTIL ZONAL", COLOR: "e9e300" },
    { LOGO: null, EQUIPO: "JESSI ESPARZA NVA", CATEGORIA: "INFANTIL ZONAL", COLOR: "ffc547" },
    { LOGO: null, EQUIPO: "ENOVA NVA", CATEGORIA: "CADETE 2ª DIVISION", COLOR: "fd008d" },
    { LOGO: null, EQUIPO: "UP! SCHOOL NVA", CATEGORIA: "CADETE ZONAL", COLOR: "fa05e8" },
    { LOGO: null, EQUIPO: "JESSI ESPARZA NVA", CATEGORIA: "CADETE ZONAL", COLOR: "fd75ea" },
    { LOGO: null, EQUIPO: "ESPAI LABORAL NVA", CATEGORIA: "JUVENIL ZONAL", COLOR: "9a0dda" },
    { LOGO: null, EQUIPO: "ENOVA NVA", CATEGORIA: "SENIOR 2ª DIVISION", COLOR: "b60809" },
    { LOGO: null, EQUIPO: "ESCOLA NVA", CATEGORIA: "MIXTO", COLOR: "00cb00" },
    { LOGO: null, EQUIPO: "CLUB NVA", CATEGORIA: "TODOS", COLOR: "0001e8" }
];

let OTROS_EQUIPOS_DATA = [];

// Referencias del DOM originales
const jpgButton = document.getElementById('jpg-button');
const btnAddFirst = document.getElementById('btn-add-first');
const btnReset = document.getElementById('btn-reset');
const calendarArea = document.getElementById('clickable-calendar');
const calendarModal = document.getElementById('calendarModal');
const applyCalendarButton = document.getElementById('applyCalendarButton');
const dateText = document.getElementById('date-text');
const textContainer = document.getElementById('text-container');
const mainContent = document.getElementById('main-content');
const cardTemplate = document.getElementById('card-template');

// === NUEVAS Referencias DOM para el TXT ===
const btnLoadHistory = document.getElementById('btn-load-history');
const txtFileInput = document.getElementById('txt-file-input');
const historyModal = document.getElementById('historyModal');
const historyListContainer = document.getElementById('historyListContainer');
const closeHistoryModal = document.getElementById('closeHistoryModal');

let historyDataCache = []; // Almacena el parseo del TXT

// Variables de estado
let calendarViewDate = new Date();
let selectedStartDate = null;
let selectedEndDate = null;
let currentActiveCard = null;
let currentTargetSide = 'home';
let activeModalTab = 'nva';
let currentScoreContainer = null;

// Referencias de Modales
const calendarMonthTitle = document.getElementById('calendarMonthTitle');
const calendarDaysGrid = document.getElementById('calendarDaysGrid');
const calendarInfoText = document.getElementById('calendarInfoText');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const teamPickerModal = document.getElementById('teamPickerModal');
const teamListContainer = document.getElementById('teamListContainer');
const customTeamInput = document.getElementById('customTeamInput');
const applyCustomTeamBtn = document.getElementById('applyCustomTeamBtn');
const modalTeamTitle = document.getElementById('modalTeamTitle');
const scoreModal = document.getElementById('scoreModal');
const scoreModalTitle = document.getElementById('scoreModalTitle');
const tabNvaBtn = document.getElementById('tabNvaBtn');
const tabOthersBtn = document.getElementById('tabOthersBtn');

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// ==========================================
// NUEVA LÓGICA: CARGA Y PARSEO DE ARCHIVO TXT
// ==========================================

btnLoadHistory.addEventListener('click', () => txtFileInput.click());

txtFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => parseHistoryFile(event.target.result);
    reader.readAsText(file);
    e.target.value = ''; // Reset para poder volver a cargar el mismo archivo
});

function parseHistoryFile(text) {
    const lines = text.split(/\r?\n/);
    historyDataCache = [];
    let currentGroup = null;

    for (const line of lines) {
        const trimmed = line.trim();
        // Separador por linea en blanco
        if (trimmed === '') {
            if (currentGroup) {
                historyDataCache.push(currentGroup);
                currentGroup = null;
                if (historyDataCache.length >= 5) break; // Limite: primeras 5 fechas
            }
            continue;
        }

        if (!currentGroup) {
            currentGroup = { date: trimmed, matches: [] }; // Primera fila: Fecha
        } else {
            // Filas siguientes: Partidos
            const parts = trimmed.split('|').map(s => s.trim());
            if (parts.length >= 2) {
                currentGroup.matches.push({
                    homeTeam: parts[0],
                    awayTeam: parts[1],
                    matchDate: parts[2] || '',
                    matchTime: parts[3] || '',
                    field: parts[4] || ''
                });
            }
        }
    }
    // Asegurarse de guardar el ultimo grupo procesado si no hay linea final
    if (currentGroup && historyDataCache.length < 5) {
        historyDataCache.push(currentGroup);
    }

    if (historyDataCache.length > 0) {
        showHistoryModal();
    } else {
        showToast("El archivo no tiene el formato correcto o está vacío.", true);
    }
}

function showHistoryModal() {
    historyListContainer.innerHTML = '';
    
    historyDataCache.forEach(group => {
        const btn = document.createElement('button');
        btn.className = 'history-list-btn';
        btn.textContent = group.date;
        btn.addEventListener('click', () => {
            loadHistoryDate(group);
            historyModal.style.display = 'none';
        });
        historyListContainer.appendChild(btn);
    });
    
    historyModal.style.display = 'flex';
}

closeHistoryModal.addEventListener('click', () => historyModal.style.display = 'none');

// Encuentra un equipo en las listas cargadas ignorando mayusculas
function findTeamData(teamName) {
    const searchName = teamName.trim().toUpperCase();
    let team = EQUIPOS_NVA_DATA.find(t => (t.EQUIPO || t.equipo || '').toString().trim().toUpperCase() === searchName);
    if (team) return { ...team, isNva: true };
    team = OTROS_EQUIPOS_DATA.find(t => (t.EQUIPO || t.equipo || '').toString().trim().toUpperCase() === searchName);
    if (team) return { ...team, isNva: false };
    return null;
}

// Simula la selección manual de un equipo y lo aplica al cuadro
function simulateApplyTeamToCard(card, side, teamName) {
    const targetCont = card.querySelector(side === 'home' ? '.team-home-container' : '.team-away-container');
    const targetSpan = targetCont.querySelector('.team-inner-text');
    const targetBadgeImg = card.querySelector(side === 'home' ? '.badge-home img' : '.badge-away img');
    const cardBg = card.querySelector('.card-bg');
    const categoryEl = card.querySelector('.text-category');

    targetSpan.textContent = teamName;
    autoFitTeamText(targetCont, targetSpan);

    const teamData = findTeamData(teamName);
    
    if (teamData) {
        const logoVal = teamData.LOGO || teamData.logo;
        if (logoVal && String(logoVal).trim() !== "" && String(logoVal).trim() !== "NaN") {
            targetBadgeImg.src = `LOGOs/${logoVal}.png`;
            targetBadgeImg.style.display = 'block';
        } else {
            targetBadgeImg.style.display = 'none';
        }

        // Si es de NVA, simula la lógica de aplicación de colores y categoría
        if (teamData.isNva) {
            categoryEl.textContent = teamData.CATEGORIA || teamData.categoria || '';
            const colorCode = teamData.COLOR || teamData.color || '';
            if (colorCode) {
                applyColorFilter(cardBg, colorCode);
                cardBg.dataset.appliedColor = colorCode;
            }
        }
    } else {
        targetBadgeImg.style.display = 'none';
    }
}

function loadHistoryDate(group) {
    mainContent.innerHTML = '';
    dateText.textContent = group.date.toLowerCase();
    fitCalendarText();

    group.matches.forEach(match => {
        createNewCard();
        const currentCard = mainContent.lastElementChild;
        
        simulateApplyTeamToCard(currentCard, 'home', match.homeTeam);
        simulateApplyTeamToCard(currentCard, 'away', match.awayTeam);
    });

    saveAppState();
    updateAddFirstButtonVisibility();
    showToast("Historial cargado con éxito.");
}

// ==========================================
// RESTO DEL CÓDIGO ORIGINAL (Sin alteraciones lógicas)
// ==========================================

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: ${isError ? '#b40000' : 'var(--nva-success)'}; color: ${isError ? '#fff' : '#000'};
        padding: 10px 20px; border-radius: 8px; font-weight: bold; z-index: 9999;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5); font-family: Arial, sans-serif; font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function autoFitScoreText(scoreBox) {
    if (!scoreBox) return;
    const span = scoreBox.querySelector('.score-inner-text');
    if (!span) return;
    span.style.transform = 'none';
    const contWidth = scoreBox.clientWidth;
    const contHeight = scoreBox.clientHeight;
    if (contWidth === 0 || contHeight === 0) return;
    const baseFontSize = contHeight;
    span.style.fontSize = `${baseFontSize}px`;
    const textWidth = span.scrollWidth;
    const textHeight = span.scrollHeight;
    if (textWidth === 0 || textHeight === 0) return;
    const aspectY = 1.5;
    const maxScaleX = contWidth / textWidth;
    const maxScaleY = contHeight / (textHeight * aspectY);
    const fitFactor = Math.min(maxScaleX, maxScaleY);
    span.style.transform = `scale(${fitFactor}, ${fitFactor * aspectY})`;
}

function saveAppState() {
    const state = { dateText: document.getElementById('date-text').textContent, cards: [] };
    document.querySelectorAll('.match-card-container').forEach(card => {
        state.cards.push({
            category: card.querySelector('.text-category').textContent,
            homeTeam: card.querySelector('.team-home-container .team-inner-text').textContent,
            awayTeam: card.querySelector('.team-away-container .team-inner-text').textContent,
            homeScore: card.querySelector('.text-score-home .score-inner-text').textContent,
            awayScore: card.querySelector('.text-score-away .score-inner-text').textContent,
            homeLogo: card.querySelector('.badge-home img').getAttribute('src') || '',
            awayLogo: card.querySelector('.badge-away img').getAttribute('src') || '',
            homeLogoDisplay: card.querySelector('.badge-home img').style.display,
            awayLogoDisplay: card.querySelector('.badge-away img').style.display,
            colorCode: card.querySelector('.card-bg').dataset.appliedColor || ''
        });
    });
    localStorage.setItem('nvaAppSavedState', JSON.stringify(state));
}

function loadAppState() {
    const saved = localStorage.getItem('nvaAppSavedState');
    if (!saved) return false; 
    const state = JSON.parse(saved);
    mainContent.innerHTML = '';
    if (state.dateText) {
        document.getElementById('date-text').textContent = state.dateText;
        fitCalendarText();
    }
    if (state.cards && state.cards.length > 0) {
        state.cards.forEach(cardData => {
            createNewCard(); 
            const currentCard = mainContent.lastElementChild;
            currentCard.querySelector('.text-category').textContent = cardData.category;
            
            const scoreHomeContainer = currentCard.querySelector('.text-score-home');
            const scoreAwayContainer = currentCard.querySelector('.text-score-away');
            scoreHomeContainer.querySelector('.score-inner-text').textContent = cardData.homeScore;
            scoreAwayContainer.querySelector('.score-inner-text').textContent = cardData.awayScore;
            autoFitScoreText(scoreHomeContainer);
            autoFitScoreText(scoreAwayContainer);

            const homeSpan = currentCard.querySelector('.team-home-container .team-inner-text');
            homeSpan.textContent = cardData.homeTeam;
            autoFitTeamText(currentCard.querySelector('.team-home-container'), homeSpan);

            const awaySpan = currentCard.querySelector('.team-away-container .team-inner-text');
            awaySpan.textContent = cardData.awayTeam;
            autoFitTeamText(currentCard.querySelector('.team-away-container'), awaySpan);

            const homeImg = currentCard.querySelector('.badge-home img');
            if (cardData.homeLogo) homeImg.src = cardData.homeLogo;
            homeImg.style.display = cardData.homeLogoDisplay || 'none';

            const awayImg = currentCard.querySelector('.badge-away img');
            if (cardData.awayLogo) awayImg.src = cardData.awayLogo;
            awayImg.style.display = cardData.awayLogoDisplay || 'none';

            const cardBg = currentCard.querySelector('.card-bg');
            if (cardData.colorCode) {
                cardBg.dataset.appliedColor = cardData.colorCode;
                applyColorFilter(cardBg, cardData.colorCode);
            } else {
                cardBg.dataset.appliedColor = 'FFFFFF';
                applyColorFilter(cardBg, 'FFFFFF');
            }
            updateMatchGlow(currentCard);
        });
    }
    updateAddFirstButtonVisibility();
    return true;
}

function updateAddFirstButtonVisibility() {
    const cardCount = mainContent.querySelectorAll('.match-card-container').length;
    if (cardCount === 0) {
        btnAddFirst.style.display = 'inline-block';
        btnReset.style.display = 'none';
    } else {
        btnAddFirst.style.display = 'none';
        btnReset.style.display = 'inline-block';
    }
}

btnReset.addEventListener('click', () => {
    const confirmar = confirm('¿Estás seguro de que quieres borrar todo el cartel y empezar de cero?');
    if (confirmar) {
        mainContent.innerHTML = '';
        document.getElementById('date-text').textContent = '';
        localStorage.removeItem('nvaAppSavedState');
        createNewCard();
        saveAppState();
        updateAddFirstButtonVisibility();
    }
});

async function prepareCardsForCapture() {
    const promises = [];
    document.querySelectorAll('.match-card-container').forEach(card => {
        const cardBg = card.querySelector('.card-bg');
        const cardOutline = card.querySelector('.card-outline');
        
        const p = new Promise((resolve) => {
            const imgBg = new Image();
            const imgOutline = new Image();
            imgBg.crossOrigin = "anonymous";
            imgOutline.crossOrigin = "anonymous";
            let loadedCount = 0;
            const onImageLoad = () => {
                loadedCount++;
¡Hola! Como ingeniero de software, he analizado tu código original[cite: 1] y he refactorizado la aplicación para cumplir con tus requisitos. 

He separado el código monolítico en tres archivos distintos (**HTML, CSS y JS**) para seguir las mejores prácticas de modularidad, mantenibilidad y orden. Además, he implementado la lógica de lectura de archivos `.txt`, la nueva interfaz modal y la generación dinámica de partidos respetando la estructura de los objetos de los equipos para que se vinculen los logos y colores automáticamente.

A continuación tienes los bloques de código y las instrucciones para conectarlos.

### 1. Estructura HTML (`index.html`)
Este archivo contiene la semántica y estructura visual. He añadido el botón flotante en la parte superior derecha y el nuevo modal para el historial.

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nou Volei Alzira - Cartel de Resultados</title>
    <!-- Enlace al archivo Manifest para PWA / APK -->
    <link rel="manifest" href="manifest.json">
    
    <!-- Hojas de estilo y Scripts externos -->
    <link rel="stylesheet" href="style.css">
    <script src="[https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js](https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js)"></script>
    <script src="[https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js](https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js)"></script>
</head>
<body>

    <!-- NUEVO: Botón flotante para cargar historial -->
    <button id="btn-load-history" class="top-right-float">📂 Cargar Historial</button>
    <input type="file" id="history-file-input" accept=".txt" style="display: none;">

    <!-- Barra flotante de acciones en la esquina inferior derecha -->
    <div id="excel-loader-bar">
        <div class="bar-actions">
            <button id="btn-reset">🔄 RESET</button>
            <button id="btn-add-first">➕ NUEVO RECUADRO</button>
            <button id="jpg-button">📥 DESCARGAR JPG</button>
        </div>
    </div>

    <!-- Contenedor del área capturable -->
    <div id="capture-area">
        <header id="header-banner">
            <img id="bg-image" src="Imagenes/TITULO.png" alt="Nou Volei Alzira">
            <div id="clickable-logo" title="Banner superior"></div>
            <div id="clickable-calendar" title="Haz clic para seleccionar el rango de fechas"></div>
            <div id="text-container">
                <span id="date-text"></span>
            </div>
        </header>

        <main id="main-content"></main>
    </div>

    <!-- NUEVO: Modal de selección de historial -->
    <div id="historyModal" class="modal">
        <div class="modal-box">
            <h3>Seleccionar Fecha de Historial</h3>
            <p style="font-size: 12px; color: #aaa; margin-bottom: 10px;">Selecciona una de las fechas extraídas del archivo de texto.</p>
            <div id="history-dates-list" class="team-options-list"></div>
            <button id="btn-close-history" class="btn-modal-action" style="margin-top: 10px; background-color: #444;">Cancelar</button>
        </div>
    </div>

    <!-- Modal Calendario Banner Superior -->
    <div id="calendarModal" class="modal">
        <div class="modal-box" style="max-width: 380px;">
            <h3>Seleccionar Rango de Fechas</h3>
            <div class="calendar-container">
                <div class="calendar-header">
                    <button id="prevMonthBtn">&lt;</button>
                    <span id="calendarMonthTitle" style="font-weight: bold; font-size: 15px; text-transform: capitalize;"></span>
                    <button id="nextMonthBtn">&gt;</button>
                </div>
                <div class="calendar-grid" id="calendarGridDaysNames">
                    <div class="calendar-day-name">L</div>
                    <div class="calendar-day-name">M</div>
                    <div class="calendar-day-name">X</div>
                    <div class="calendar-day-name">J</div>
                    <div class="calendar-day-name">V</div>
                    <div class="calendar-day-name">S</div>
                    <div class="calendar-day-name">D</div>
                </div>
                <div class="calendar-grid" id="calendarDaysGrid"></div>
                <div class="calendar-info" id="calendarInfoText">Haz clic en el día de inicio</div>
            </div>
            <button id="applyCalendarButton" class="btn-modal-action" disabled style="opacity: 0.5; cursor: not-allowed;">Aplicar Fechas</button>
        </div>
    </div>

    <!-- Modal selección de tanteo -->
    <div id="scoreModal" class="modal">
        <div class="modal-box">
            <h3 id="scoreModalTitle">Seleccionar Tanteo</h3>
            <div class="score-options-grid">
                <button class="score-option-btn" data-value="0">0</button>
                <button class="score-option-btn" data-value="1">1</button>
                <button class="score-option-btn" data-value="2">2</button>
                <button class="score-option-btn" data-value="3">3</button>
            </div>
        </div>
    </div>

    <!-- Modal selección de equipos -->
    <div id="teamPickerModal" class="modal">
        <div class="modal-box">
            <h3 id="modalTeamTitle">Seleccionar Equipo</h3>
            <div class="modal-tabs">
                <button id="tabNvaBtn" class="modal-tab-btn active">Equipos NVA</button>
                <button id="tabOthersBtn" class="modal-tab-btn">Otros Equipos</button>
            </div>
            <div class="team-options-list" id="teamListContainer"></div>
            <div style="border-top: 1px solid #444; padding-top: 12px;">
                <input type="text" id="customTeamInput" class="custom-input" placeholder="O escribir nombre de equipo rival...">
                <button id="applyCustomTeamBtn" class="btn-modal-action" style="background-color: #444;">Aplicar Rival</button>
            </div>
        </div>
    </div>

    <!-- Plantilla del cuadro sin elementos inferiores -->
    <template id="card-template">
        <div class="match-card-container">
            <button class="btn-delete-card" title="Eliminar este recuadro">✕</button>
            <button class="btn-add-card-below" title="Crear nuevo recuadro debajo">+</button>

            <!-- Capa 1: Foto al fondo -->
            <div class="card-photo-layer" title="Haz clic para subir foto. Arrastra para moverla y usa la rueda del ratón o pellizco para zoom. Doble clic para cambiar foto.">
                <span class="photo-placeholder">📷 Clic para subir foto</span>
                <img class="photo-img" src="" alt="Foto del partido">
                <input type="file" accept="image/*" style="display: none;">
            </div>

            <!-- Capa 2: Fondo 3D -->
            <img class="card-bgb" src="Imagenes/Cuadro BASE (fondo).png" alt="Fondo 3D">
            
            <!-- Capa 3: Escudos / Logos -->
            <div class="badge-slot badge-home"><img src="" alt="Escudo Local"></div>
            <div class="badge-slot badge-away"><img src="" alt="Escudo Visitante"></div>

            <!-- Capa 4: Resultados / Tanteo -->
            <div class="text-score-home" title="Haz clic para cambiar tanteo local"><span class="score-inner-text">0</span></div>
            <div class="text-score-divider">-</div>
            <div class="text-score-away" title="Haz clic para cambiar tanteo visitante"><span class="score-inner-text">0</span></div>

            <!-- Capa 5: Nombres de equipos y categoría -->
            <div class="text-overlay text-category"></div>
            <div class="text-overlay team-container team-home-container" title="Seleccionar Equipo de Casa"><span class="team-inner-text">HOME</span></div>
            <div class="text-overlay team-container team-away-container" title="Seleccionar Equipo de Visita"><span class="team-inner-text">VISIT</span></div>

            <!-- Capa 6: Cuadro BASE (marco) -->
            <img class="card-bg" src="Imagenes/Cuadro BASE.png" alt="Fondo Marco" data-original-src="Imagenes/Cuadro BASE.png">

            <!-- Capa 7: Cuadro BASE (sombra) -->
            <img class="card-outline" src="Imagenes/Cuadro BASE (sombra).png" alt="Contorno 3D">
        </div>
    </template>

    <!-- Script principal de la aplicación -->
    <script src="script.js"></script>
</body>
</html>