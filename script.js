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
let clickCount = 0; // Track the number of clicks on the video
let currentVideo = 1; // Track the current video (1 or 2)

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

                gridItem.style.backgroundImage = `url('other.webp')`;

                if (row === centerRow && col === centerCol) {
                    gridItem.classList.add('center');

                    const video = document.createElement('video');
                    video.className = 'center-video';
                    video.muted = true; // Keep muted initially
                    video.playsInline = true;
                    video.autoplay = true; // Added autoplay attribute
                    video.setAttribute('preload', 'auto');
                    video.setAttribute('loop', 'true');
                    video.setAttribute('poster', 'center.webp'); // Add this line for the poster image

                    // Add the first source: WebM
                    const sourceWebM = document.createElement('source');
                    sourceWebM.src = 'center.webm';
                    sourceWebM.type = 'video/webm';
                    video.appendChild(sourceWebM);

                    // Add a fallback source: MP4
                    const sourceMP4 = document.createElement('source');
                    sourceMP4.src = 'center.mp4';
                    sourceMP4.type = 'video/mp4';
                    video.appendChild(sourceMP4);

                    // Fallback message if the browser can't play any of the formats
                    const fallbackText = document.createTextNode('Your browser does not support the video tag or the provided formats.');
                    video.appendChild(fallbackText);

                    gridItem.appendChild(video);

                    gridItem.addEventListener('click', () => handleGridItemClick());
                    video.addEventListener('click', (event) => {
                        event.stopPropagation();
                        handleVideoClick(); // Updated to call handleVideoClick
                    });
                }

                if (row === centerRow + 1 && col === centerCol) {
                    gridItem.style.backgroundImage = `url('other.webp')`;
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

function handleVideoClick() {
    if (clickCount === 0) {
        applyInversion(); // Apply inversion on the first click
    } else {
        applyRandomFilter(); // Apply random filter on subsequent clicks
    }
    clickCount++; // Increment clickCount
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
    // This function can remain empty or be used for other media controls
}

let audioInitialized = false;

function initializeAudio() {
    const audio = document.getElementById('background-audio');
    const muteButton = document.getElementById('mute-button');
    const songCredit = document.getElementById('song-credit');

    updateMuteButton();

    muteButton.addEventListener('click', () => {
        if (!audioInitialized) {
            // Set the src attribute and play the audio when the user clicks unmute for the first time
            audio.src = 'aquarius_siteperso.mp3';
            audioInitialized = true;
        }

        if (audio.muted) {
            audio.muted = false;
            audio.play().catch(err => {
                console.error('Audio play failed:', err);
            });
        } else {
            audio.muted = true;
        }

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

    if (inputSequence.endsWith('alex') || inputSequence.endsWith('couscous') || inputSequence.endsWith('marwa')) {
        switchVideo();
        inputSequence = '';
    }

    // Limit the length of the input sequence to avoid unnecessary memory usage
    if (inputSequence.length > 9) {
        inputSequence = inputSequence.slice(1);
    }
});

function switchVideo() {
    const videoElement = document.querySelector('.center-video');
    const webmSource = document.querySelector('.center-video source[type="video/webm"]');
    const mp4Source = document.querySelector('.center-video source[type="video/mp4"]');

    if (videoElement && webmSource && mp4Source) {
        // Start fade-out
        videoElement.classList.add('fade-out');

        // Wait for the fade-out to complete
        setTimeout(() => {
            // Switch video sources
            if (currentVideo === 1) {
                webmSource.src = 'center2.webm';  // Switch to the second WebM video
                mp4Source.src = 'center2.mp4';    // Switch to the second MP4 video as a fallback
                currentVideo = 2; // Update the current video tracker
            } else {
                webmSource.src = 'center.webm';   // Switch back to the first WebM video
                mp4Source.src = 'center.mp4';     // Switch back to the first MP4 video as a fallback
                currentVideo = 1; // Update the current video tracker
            }

            // Load the new video sources
            videoElement.load();

            // Listen for the video to be ready to play
            videoElement.onloadeddata = () => {
                // Start fade-in after the video is loaded
                videoElement.classList.remove('fade-out');
                videoElement.classList.add('fade-in');

                videoElement.play();

                // Reset the fade-in effect for the next transition
                setTimeout(() => {
                    videoElement.classList.remove('fade-in'); // Remove fade-in after it has played
                }, 1000); // Match the transition duration
            };
        }, 1000); // Match this duration to the fade-out duration
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const infoButton = document.getElementById('info-button');
    const infoText = document.getElementById('info-text');

    infoButton.addEventListener('click', () => {
        infoText.classList.toggle('visible');

        if (infoText.classList.contains('visible')) {
            // Set a timeout to hide the info-text after 15 seconds (15000 milliseconds)
            setTimeout(() => {
                infoText.classList.remove('visible');
            }, 15000);  // 15 seconds
        }
    });
});
