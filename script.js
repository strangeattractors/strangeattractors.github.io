// === Constants ===
const MOBILE_BREAKPOINT = 980;
const IMG_ORIGINAL_SIZE = 504;
const MIN_CELL_SIZE = 100;
const RESIZE_DEBOUNCE_MS = 150;

// Typing any of these switches the center video (easter egg)
const VIDEO_SWITCH_SEQUENCES = ['alex', 'couscous', 'usquare', 'strange'];
const VIDEO_SOURCES = [
    { webm: 'center.webm', mp4: 'center.mp4' },
    { webm: 'center2.webm', mp4: 'center2.mp4' },
];

// === DOM references ===
const content = document.getElementById('content');
const gridContainer = document.getElementById('grid-container');
const missionText = document.getElementById('mission-text');
const infoText = document.getElementById('info-text');
const songCredit = document.getElementById('song-credit');
const audio = document.getElementById('background-audio');
const muteButton = document.getElementById('mute-button');

// === State ===
let videoIndex = 0;
let inputSequence = '';
let infoHideTimer = null;
let songCreditHideTimer = null;
let lastGridSize = { width: 0, height: 0 };

// The center video is created once and overlaid on the center cell; grid
// rebuilds never touch it, so resizes never re-download or restart it.
let centerVideo = null;

const isMobileView = () => window.innerWidth <= MOBILE_BREAKPOINT;

// === Init (script is loaded at the end of <body>, DOM is ready) ===
createGrid();
setupControls();
setupKeyboardListener();
setupLoadingOverlay();

window.addEventListener('resize', debounce(handleResize, RESIZE_DEBOUNCE_MS));

// === Grid ===
function createGrid() {
    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    lastGridSize = { width: viewportWidth, height: viewportHeight };

    const displayScale = isMobileView() ? 1 : 0.75;
    const maxCellSize = IMG_ORIGINAL_SIZE * displayScale;
    const cellSize = Math.min(maxCellSize, Math.max(MIN_CELL_SIZE, Math.min(viewportWidth, viewportHeight)));

    // Grid dimensions that cover the viewport, odd counts so a cell sits
    // exactly in the middle, plus one extra row/column on each side.
    let cols = Math.ceil(viewportWidth / cellSize);
    let rows = Math.ceil(viewportHeight / cellSize);
    if (cols % 2 === 0) cols += 1;
    if (rows % 2 === 0) rows += 1;
    cols += 2;
    rows += 2;

    const centerCol = Math.floor(cols / 2);
    const centerRow = Math.floor(rows / 2);

    // Position the grid so the center cell is centered in the viewport
    const gridLeft = viewportWidth / 2 - cellSize / 2 - centerCol * cellSize;
    const gridTop = viewportHeight / 2 - cellSize / 2 - centerRow * cellSize;

    gridContainer.style.width = `${cols * cellSize}px`;
    gridContainer.style.height = `${rows * cellSize}px`;
    gridContainer.style.left = `${gridLeft}px`;
    gridContainer.style.top = `${gridTop}px`;
    gridContainer.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    gridContainer.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

    // Rebuild only the background tiles; the video element stays attached so
    // playback is never interrupted
    gridContainer.querySelectorAll('.grid-item').forEach(el => el.remove());
    for (let i = 0; i < rows * cols; i++) {
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';
        gridContainer.appendChild(gridItem);
    }

    // Overlay the video on the center cell
    const video = getCenterVideo();
    video.style.left = `${centerCol * cellSize}px`;
    video.style.top = `${centerRow * cellSize}px`;
    video.style.width = `${cellSize}px`;
    video.style.height = `${cellSize}px`;
}

function getCenterVideo() {
    if (centerVideo) return centerVideo;

    centerVideo = document.createElement('video');
    centerVideo.className = 'center-video';
    centerVideo.muted = true;
    centerVideo.playsInline = true;
    centerVideo.autoplay = true;
    centerVideo.loop = true;
    centerVideo.preload = 'auto';
    // First frame of the video: lets the attractor appear during the page
    // entrance even if the video itself is still downloading, and the video
    // takes over seamlessly from the identical still
    centerVideo.poster = 'center-poster.webp';

    for (const [type, src] of Object.entries(VIDEO_SOURCES[videoIndex])) {
        const source = document.createElement('source');
        source.src = src;
        source.type = `video/${type}`;
        centerVideo.appendChild(source);
    }
    centerVideo.appendChild(document.createTextNode('Your browser does not support the video tag or the provided formats.'));

    // Hidden during the page reveal: the digit field fades in first as a
    // seamless whole (the center cell is just another tile), then the
    // attractor materializes over it (see setupLoadingOverlay)
    centerVideo.classList.add('fade-out');

    centerVideo.addEventListener('click', handleVideoClick);
    gridContainer.appendChild(centerVideo);
    return centerVideo;
}

function handleResize() {
    const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    // Ignore spurious resize events (e.g. mobile address bar) that don't
    // change the viewport size
    if (width !== lastGridSize.width || height !== lastGridSize.height) {
        createGrid();
    }

    // Keep the grid shift consistent with the mission panel and screen size
    const missionVisible = missionText.classList.contains('visible');
    gridContainer.classList.toggle('shifted', missionVisible && !isMobileView());
}

// === Mission / info panels ===
function showMission() {
    if (!isMobileView()) gridContainer.classList.add('shifted');
    missionText.classList.add('visible');
    infoText.classList.remove('visible');
}

function hideMission() {
    missionText.classList.remove('visible');
    gridContainer.classList.remove('shifted');
}

function handleVideoClick() {
    applyRandomFilter();
    showMission();
}

// === Color filters ===
// All filter strings keep the same 7 functions in the same order so CSS can
// smoothly interpolate between any two color states.
function setContentFilter({ invert = 0, hueRotate = 0, brightness = 1, contrast = 1, saturate = 1, sepia = 0, grayscale = 0 } = {}) {
    content.style.filter =
        `invert(${invert}) hue-rotate(${hueRotate}deg) brightness(${brightness}) ` +
        `contrast(${contrast}) saturate(${saturate}) sepia(${sepia}) grayscale(${grayscale})`;
}

function applyRandomFilter() {
    setContentFilter({
        hueRotate: Math.floor(Math.random() * 360),
        brightness: Math.random() * 0.4 + 0.8,
        contrast: Math.random() * 0.4 + 0.8,
        saturate: Math.random() * 0.4 + 0.8,
        sepia: (Math.random() * 0.3).toFixed(2),
        grayscale: (Math.random() * 0.3).toFixed(2),
    });
}

// === Video switch easter egg ===
function switchVideo() {
    if (!centerVideo) return;

    videoIndex = (videoIndex + 1) % VIDEO_SOURCES.length;
    centerVideo.classList.add('fade-out');

    // Wait for the fade-out before swapping sources
    setTimeout(() => {
        const { webm, mp4 } = VIDEO_SOURCES[videoIndex];
        centerVideo.querySelector('source[type="video/webm"]').src = webm;
        centerVideo.querySelector('source[type="video/mp4"]').src = mp4;
        centerVideo.load();

        centerVideo.addEventListener('loadeddata', () => {
            centerVideo.classList.remove('fade-out');
            centerVideo.classList.add('fade-in');
            centerVideo.play();
            setTimeout(() => centerVideo.classList.remove('fade-in'), 1000);
        }, { once: true });
    }, 1000);
}

function setupKeyboardListener() {
    const maxLength = Math.max(...VIDEO_SWITCH_SEQUENCES.map(s => s.length));

    document.addEventListener('keydown', (event) => {
        inputSequence = (inputSequence + event.key).slice(-maxLength);

        if (VIDEO_SWITCH_SEQUENCES.some(s => inputSequence.endsWith(s))) {
            switchVideo();
            inputSequence = '';
        }
    });
}

// === Controls ===
function setupControls() {
    document.getElementById('info-button').addEventListener('click', () => {
        infoText.classList.toggle('visible');
        hideMission();

        clearTimeout(infoHideTimer);
        if (infoText.classList.contains('visible')) {
            infoHideTimer = setTimeout(() => infoText.classList.remove('visible'), 15000);
        }
    });

    document.getElementById('mission-button').addEventListener('click', () => {
        if (missionText.classList.contains('visible')) {
            hideMission();
        } else {
            showMission();
        }
    });

    muteButton.addEventListener('click', () => {
        // The audio file is only fetched on first unmute
        if (!audio.src) audio.src = 'aquarius_siteperso.mp3';

        audio.muted = !audio.muted;
        if (!audio.muted) {
            audio.play().catch(err => console.error('Audio play failed:', err));
            showSongCredit();
        }
        updateMuteButton();
    });
}

function updateMuteButton() {
    muteButton.classList.toggle('unmuted', !audio.muted);
    muteButton.setAttribute('aria-label', audio.muted ? 'Unmute audio' : 'Mute audio');
}

function showSongCredit() {
    songCredit.classList.add('visible');
    clearTimeout(songCreditHideTimer);
    songCreditHideTimer = setTimeout(() => songCredit.classList.remove('visible'), 5000);
}

// === Loading overlay ===
function setupLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    const reveal = () => {
        if (overlay.classList.contains('fade-out')) return;
        overlay.classList.add('fade-out');
        overlay.addEventListener('transitionend', () => overlay.remove());
        // Let the attractor start materializing shortly into the field's
        // fade-in (poster first if the video is still loading): the entrance
        // reads as one continuous bloom, with the field leading just enough
        // that the center square never sits alone on black
        setTimeout(() => centerVideo.classList.remove('fade-out'), 200);
    };

    const pageLoaded = new Promise(resolve => {
        if (document.readyState === 'complete') resolve();
        else window.addEventListener('load', resolve, { once: true });
    });

    // The load event doesn't wait for CSS background images, so also wait for
    // the tile artwork to be decoded — otherwise the center video can show up
    // alone as a bare square against black
    const tileArt = new Image();
    tileArt.src = 'other.webp';
    const tileArtReady = tileArt.decode().catch(() => {});

    // The poster (the video's first frame, ~100KB) stands in for the
    // multi-MB video during the entrance, so the attractor can appear
    // without waiting for the video download
    const poster = new Image();
    poster.src = 'center-poster.webp';
    const posterReady = poster.decode().catch(() => {});

    Promise.all([pageLoaded, tileArtReady, posterReady]).then(reveal);
    // Safety net in case loading stalls on a slow connection
    setTimeout(reveal, 6000);
}

// === Utilities ===
function debounce(fn, delayMs) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delayMs);
    };
}
