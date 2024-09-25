// Function to preload images if necessary (optional)
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = reject;
    });
}

let isFirstClick = true;
let inputSequence = '';

async function createGrid() {
    const container = document.getElementById('grid-container');
    try {
        container.innerHTML = '';

        const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

        const imgOriginalSize = 504;
        let displayScale = 0.75;

        // Determine displayScale based on screen width
        const screenWidth = window.innerWidth;

        if (screenWidth <= 980) { // Mobile devices
            displayScale = 1;
        } else { // Desktop and larger screens
            displayScale = 0.75;
        }
        const minCellSize = 100;
        const maxCellSize = imgOriginalSize * displayScale;

        let cellSize = Math.min(maxCellSize, Math.max(minCellSize, Math.min(viewportWidth, viewportHeight)));

        let cols = Math.ceil(viewportWidth / cellSize);
        let rows = Math.ceil(viewportHeight / cellSize);

        if (cols % 2 === 0) cols += 1;
        if (rows % 2 === 0) rows += 1;

        const gridWidth = cols * cellSize;
        const gridHeight = rows * cellSize;

        const centerCol = Math.floor(cols / 2);
        const centerRow = Math.floor(rows / 2);

        const gridLeft = (viewportWidth / 2) - (cellSize / 2) - (centerCol * cellSize);
        const gridTop = (viewportHeight / 2) - (cellSize / 2) - (centerRow * cellSize);

        container.style.width = `${gridWidth}px`;
        container.style.height = `${gridHeight}px`;
        container.style.left = `${gridLeft}px`;
        container.style.top = `${gridTop}px`;

        container.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        container.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';

                gridItem.style.backgroundImage = `url('other.png')`;

                if (row === centerRow && col === centerCol) {
                    gridItem.classList.add('center');

                    const video = document.createElement('video');
                    video.className = 'center-video';
                    video.muted = true;
                    video.playsInline = true;
                    video.setAttribute('preload', 'auto');
                    video.setAttribute('autoplay', 'true');
                    video.setAttribute('loop', 'true');

                    const sourceWebM = document.createElement('source');
                    sourceWebM.src = 'center.webm';
                    sourceWebM.type = 'video/webm';

                    video.appendChild(sourceWebM);
                    gridItem.appendChild(video);

                    gridItem.addEventListener('click', () => handleGridItemClick());
                    video.addEventListener('click', (event) => {
                        event.stopPropagation();
                        handleGridItemClick();
                    });
                }

                if (row === centerRow + 1 && col === centerCol) {
                    gridItem.style.backgroundImage = `url('other.png')`;
                }

                container.appendChild(gridItem);
            }
        }
    } catch (error) {
        console.error('Error loading background image:', error);
    }
}

function handleGridItemClick() {
    if (isFirstClick) {
        applyInversion();
        isFirstClick = false;
    } else {
        applyRandomFilter();
    }
}

function applyInversion() {
    const content = document.querySelector('.content');
    if (content) {
        content.style.filter = `
            invert(100%)
            hue-rotate(0deg)
            brightness(1)
            contrast(1)
            saturate(1)
            sepia(0)
            grayscale(0)
        `;
    }
}

function applyRandomFilter() {
    const content = document.querySelector('.content');
    if (content) {
        const hueRotate = Math.floor(Math.random() * 360);
        const brightness = (Math.random() * 0.4) + 0.8;
        const contrast = (Math.random() * 0.4) + 0.8;
        const saturate = (Math.random() * 0.4) + 0.8;
        const sepia = (Math.random() * 0.3).toFixed(2);
        const grayscale = (Math.random() * 0.3).toFixed(2);

        const filterString = `
            invert(0%)
            hue-rotate(${hueRotate}deg)
            brightness(${brightness})
            contrast(${contrast})
            saturate(${saturate})
            sepia(${sepia})
            grayscale(${grayscale})
        `;

        content.style.filter = filterString;
    }
}

window.addEventListener('load', () => {
    createGrid();

    document.body.addEventListener('touchstart', playMedia, { once: true });
    document.body.addEventListener('click', playMedia, { once: true });

    initializeAudio();

    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.add('fade-out');
    loadingOverlay.addEventListener('transitionend', () => {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
    });
});

window.addEventListener('resize', createGrid);

function playMedia() {
    const video = document.querySelector('.center-video');
    if (video && video.paused) {
        video.play().catch(err => {
            console.error('Video play failed:', err);
        });
    }

    const audio = document.getElementById('background-audio');
    if (audio && audio.paused) {
        audio.play().catch(err => {
            console.error('Audio play failed:', err);
        });
    }
}

function initializeAudio() {
    const audio = document.getElementById('background-audio');
    const muteButton = document.getElementById('mute-button');
    const songCredit = document.getElementById('song-credit');

    audio.play().catch(err => {
        console.error('Audio play failed:', err);
    });

    updateMuteButton();

    muteButton.addEventListener('click', () => {
        audio.muted = !audio.muted;
        updateMuteButton();
        toggleSongCredit();
    });
}

function updateMuteButton() {
    const audio = document.getElementById('background-audio');
    const muteButton = document.getElementById('mute-button');

    if (audio.muted) {
        muteButton.classList.remove('unmuted');
        muteButton.setAttribute('aria-label', 'Unmute audio');
    } else {
        muteButton.classList.add('unmuted');
        muteButton.setAttribute('aria-label', 'Mute audio');
    }
}

function toggleSongCredit() {
    const audio = document.getElementById('background-audio');
    const songCredit = document.getElementById('song-credit');

    if (!audio.muted) {
        songCredit.classList.add('visible');
        setTimeout(() => {
            songCredit.classList.remove('visible');
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const originalButton = document.getElementById('original-color-button');
    const invertedButton = document.getElementById('inverted-color-button');
    const content = document.querySelector('.content');

    originalButton.addEventListener('click', () => {
        if (content) {
            content.style.filter = `
                invert(0%)
                hue-rotate(0deg)
                brightness(1)
                contrast(1)
                saturate(1)
                sepia(0)
                grayscale(0)
            `;
        }
        isFirstClick = false;
    });

    invertedButton.addEventListener('click', () => {
        if (content) {
            content.style.filter = `
                invert(100%)
                hue-rotate(0deg)
                brightness(1)
                contrast(1)
                saturate(1)
                sepia(0)
                grayscale(0)
            `;
        }
        isFirstClick = false;
    });
});

document.addEventListener('keydown', (event) => {
    inputSequence += event.key;

    if (inputSequence.endsWith('alex')) {
        switchVideo();
        inputSequence = '';
    }

    if (inputSequence.length > 5) {
        inputSequence = inputSequence.slice(1);
    }
});

function switchVideo() {
    const videoElement = document.querySelector('.center-video');
    const videoSource = document.querySelector('.center-video source');

    if (videoElement && videoSource) {
        // Add the fade-out effect
        videoElement.classList.add('fade-out');

        // Wait for the fade-out to complete before switching the video source
        setTimeout(() => {
            // Change the video source
            videoSource.src = 'center2.webm';
            videoElement.load();

            // Once the new video is loaded, fade it in
            videoElement.onloadeddata = () => {
                videoElement.classList.remove('fade-out');
                videoElement.classList.add('fade-in');
                videoElement.play();
            };
        }, 1000);  // This should match the duration of the CSS transition
    }
}

