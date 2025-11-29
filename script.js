import { processBasePony } from './image-utils.js';
import { setupPaletteInteractions } from './interaction-handlers.js';
import { clearAll, adjustZForSelected, flipSelected } from './stage-manager.js';

// Configuration
const BASE_PONY_SRC = '/base-pony.jpeg';

// Setup Delete Zone
const DELETE_ZONE = document.createElement('div');
DELETE_ZONE.id = 'delete-zone';
DELETE_ZONE.innerHTML = '🗑️';
document.getElementById('stage-container').appendChild(DELETE_ZONE);

// Initialize
async function init() {
    const ponyImg = document.getElementById('base-pony');

    try {
        const processedPonyUrl = await processBasePony(BASE_PONY_SRC);
        ponyImg.src = processedPonyUrl;
    } catch (e) {
        console.error('Pony processing failed, using original image:', e);
        ponyImg.src = BASE_PONY_SRC;
    }

    setupPaletteInteractions();

    document.getElementById('clear-btn').addEventListener('click', clearAll);

    document.getElementById('z-up').addEventListener('click', () => adjustZForSelected(1));
    document.getElementById('z-down').addEventListener('click', () => adjustZForSelected(-1));
    document.getElementById('flip-btn').addEventListener('click', flipSelected);
}

init();