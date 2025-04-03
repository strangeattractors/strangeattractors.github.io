// Global variables
let inputSequence = '';
let clickCount = 0;
let currentVideo = 1;
let audioInitialized = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupColorButtons();
    setupKeyboardListener();
    setupInfoAndMissionButtons();
});

window.addEventListener('load', () => {
    createGrid();
    initializeAudio();
    handleLoadingState();
});

window.addEventListener('resize', () => {
    createGrid();
    
    // Handle grid position on window resize
    const missionText = document.getElementById('mission-text');
    const gridContainer = document.getElementById('grid-container');
    
    if (missionText && missionText.classList.contains('visible')) {
        // For mobile view
        if (window.innerWidth <= 980) {
            gridContainer.classList.remove('shifted');
        } else {
            gridContainer.classList.add('shifted');
        }
    }
});

// Grid creation
async function createGrid() {
    const container = document.getElementById('grid-container');
    try {
        container.innerHTML = '';

        const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const imgOriginalSize = 504;
        
        // Determine displayScale based on screen width
        const screenWidth = window.innerWidth;
        const displayScale = screenWidth <= 980 ? 1 : 0.75;
        const minCellSize = 100;
        const maxCellSize = imgOriginalSize * displayScale;

        let cellSize = Math.min(maxCellSize, Math.max(minCellSize, Math.min(viewportWidth, viewportHeight)));

        // Calculate base grid dimensions to cover viewport
        let baseCols = Math.ceil(viewportWidth / cellSize);
        let baseRows = Math.ceil(viewportHeight / cellSize);

        // Ensure odd number of rows and columns for perfect centering
        if (baseCols % 2 === 0) baseCols += 1;
        if (baseRows % 2 === 0) baseRows += 1;
        
        // Add extra rows and columns for overflow (one on each side)
        const extraCells = 2; // One extra on each side
        const cols = baseCols + extraCells;
        const rows = baseRows + extraCells;

        // Calculate total grid dimensions
        const gridWidth = cols * cellSize;
        const gridHeight = rows * cellSize;
        
        // Find center of the expanded grid
        const centerCol = Math.floor(cols / 2);
        const centerRow = Math.floor(rows / 2);

        // Calculate grid position to center visible portion in viewport
        // We need to position it so one row/column is hidden on each side
        const gridLeft = (viewportWidth / 2) - (cellSize / 2) - (centerCol * cellSize);
        const gridTop = (viewportHeight / 2) - (cellSize / 2) - (centerRow * cellSize);

        // Set grid container styles
        container.style.width = `${gridWidth}px`;
        container.style.height = `${gridHeight}px`;
        container.style.left = `${gridLeft}px`;
        container.style.top = `${gridTop}px`;
        container.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
        container.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

        // Create grid items
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridItem.style.backgroundImage = `url('other.webp')`;

                // Add center video if this is the center cell
                if (row === centerRow && col === centerCol) {
                    createCenterVideo(gridItem);
                }

                container.appendChild(gridItem);
            }
        }
    } catch (error) {
        console.error('Error creating grid:', error);
    }
}

function createCenterVideo(gridItem) {
    gridItem.classList.add('center');
    gridItem.style.position = 'relative';

    const video = document.createElement('video');
    video.className = 'center-video';
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('preload', 'auto');
    video.setAttribute('loop', 'true');

    // Add sources for different formats
    const sourceWebM = document.createElement('source');
    sourceWebM.src = 'center.webm';
    sourceWebM.type = 'video/webm';
    video.appendChild(sourceWebM);

    const sourceMP4 = document.createElement('source');
    sourceMP4.src = 'center.mp4';
    sourceMP4.type = 'video/mp4';
    video.appendChild(sourceMP4);

    // Fallback message
    const fallbackText = document.createTextNode('Your browser does not support the video tag or the provided formats.');
    video.appendChild(fallbackText);

    gridItem.appendChild(video);
    video.addEventListener('click', handleVideoClick);
}

// Video interaction
function handleVideoClick() {
    applyRandomFilter();
    clickCount++;
    
    // Open mission text when clicking on video
    const missionText = document.getElementById('mission-text');
    const gridContainer = document.getElementById('grid-container');
    
    // Show mission text
    missionText.classList.add('visible');
    
    // Shift the grid to the left on larger screens only
    if (window.innerWidth > 980) {
        gridContainer.classList.add('shifted');
    }
    
    // Close info text if open
    document.getElementById('info-text').classList.remove('visible');
}

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
                webmSource.src = 'center2.webm';
                mp4Source.src = 'center2.mp4';
                currentVideo = 2;
            } else {
                webmSource.src = 'center.webm';
                mp4Source.src = 'center.mp4';
                currentVideo = 1;
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
                    videoElement.classList.remove('fade-in');
                }, 1000);
            };
        }, 1000);
    }
}

// Audio functionality
function initializeAudio() {
    const audio = document.getElementById('background-audio');
    const muteButton = document.getElementById('mute-button');

    updateMuteButton();

    muteButton.addEventListener('click', () => {
        if (!audioInitialized) {
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

// Color filters
function applyInversion() {
    const content = document.querySelector('.content');
    const originalButton = document.getElementById('original-color-button');
    const invertedButton = document.getElementById('inverted-color-button');
    
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
        
        // Update button styles to match the current color scheme
        originalButton.style.backgroundColor = 'rgba(245, 245, 245, 0.9)';
        originalButton.style.border = '2px solid rgba(50, 50, 50, 0.8)';
        originalButton.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.5)';
        
        invertedButton.style.backgroundColor = 'rgba(10, 10, 10, 0.9)';
        invertedButton.style.border = '2px solid rgba(200, 200, 200, 0.8)';
        invertedButton.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.5)';
    }
}

function applyOriginalColor() {
    const content = document.querySelector('.content');
    const originalButton = document.getElementById('original-color-button');
    const invertedButton = document.getElementById('inverted-color-button');
    
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
        
        // Reset button styles to their original state
        originalButton.style.backgroundColor = 'rgba(10, 10, 10, 0.9)';
        originalButton.style.border = '2px solid rgba(200, 200, 200, 0.8)';
        originalButton.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.5)';
        
        invertedButton.style.backgroundColor = 'rgba(245, 245, 245, 0.9)';
        invertedButton.style.border = '2px solid rgba(50, 50, 50, 0.8)';
        invertedButton.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.5)';
    }
}

function applyRandomFilter() {
    const content = document.querySelector('.content');
    const originalButton = document.getElementById('original-color-button');
    const invertedButton = document.getElementById('inverted-color-button');
    
    if (content) {
        const hueRotate = Math.floor(Math.random() * 360);
        const brightness = (Math.random() * 0.4) + 0.8;
        const contrast = (Math.random() * 0.4) + 0.8;
        const saturate = (Math.random() * 0.4) + 0.8;
        const sepia = (Math.random() * 0.3).toFixed(2);
        const grayscale = (Math.random() * 0.3).toFixed(2);

        content.style.filter = `
            invert(0%)
            hue-rotate(${hueRotate}deg)
            brightness(${brightness})
            contrast(${contrast})
            saturate(${saturate})
            sepia(${sepia})
            grayscale(${grayscale})
        `;
        
        // Reset button styles to their original state when applying random filter
        originalButton.style.backgroundColor = 'rgba(10, 10, 10, 0.9)';
        originalButton.style.border = '2px solid rgba(200, 200, 200, 0.8)';
        originalButton.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.5)';
        
        invertedButton.style.backgroundColor = 'rgba(245, 245, 245, 0.9)';
        invertedButton.style.border = '2px solid rgba(50, 50, 50, 0.8)';
        invertedButton.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.5)';
    }
}

// UI setup functions
function setupColorButtons() {
    const originalButton = document.getElementById('original-color-button');
    const invertedButton = document.getElementById('inverted-color-button');

    originalButton.addEventListener('click', applyOriginalColor);
    invertedButton.addEventListener('click', applyInversion);
}

function setupKeyboardListener() {
    document.addEventListener('keydown', (event) => {
        inputSequence += event.key;

        if (inputSequence.endsWith('alex') || 
            inputSequence.endsWith('couscous') || 
            inputSequence.endsWith('usquare') || 
            inputSequence.endsWith('strange')) {
            switchVideo();
            inputSequence = '';
        }

        // Limit the length of the input sequence
        if (inputSequence.length > 9) {
            inputSequence = inputSequence.slice(1);
        }
    });
}

function setupInfoAndMissionButtons() {
    const infoButton = document.getElementById('info-button');
    const infoText = document.getElementById('info-text');
    const missionButton = document.getElementById('mission-button');
    const missionText = document.getElementById('mission-text');
    const content = document.querySelector('.content');
    
    // Check if screen is mobile-sized
    const isMobileView = () => window.innerWidth <= 980;

    infoButton.addEventListener('click', () => {
        infoText.classList.toggle('visible');
        // Close mission text if open
        missionText.classList.remove('visible');
        // Reset grid position when closing mission text
        document.getElementById('grid-container').classList.remove('shifted');

        if (infoText.classList.contains('visible')) {
            // Auto-hide after 15 seconds
            setTimeout(() => {
                infoText.classList.remove('visible');
            }, 15000);
        }
    });
    
    missionButton.addEventListener('click', () => {
        const isMissionVisible = missionText.classList.contains('visible');
        const gridContainer = document.getElementById('grid-container');
        
        // Toggle mission text visibility
        missionText.classList.toggle('visible');
        
        // Shift grid left when showing mission text, reset when hiding
        // Only shift on larger screens
        if (!isMobileView()) {
            if (!isMissionVisible) {
                // Shift the grid to the left when showing mission
                gridContainer.classList.add('shifted');
            } else {
                // Reset position when hiding mission text
                gridContainer.classList.remove('shifted');
            }
        }
        
        // Close info text if open
        infoText.classList.remove('visible');
    });
    
    // Only the mission button can close the mission text
    // Remove the click event listener that closes mission text when clicking outside
}

function handleLoadingState() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.add('fade-out');
    loadingOverlay.addEventListener('transitionend', () => {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
    });
}