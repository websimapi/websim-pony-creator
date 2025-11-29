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

    const loadBase = async (src) => {
        try {
            const processedPonyUrl = await processBasePony(src);
            ponyImg.src = processedPonyUrl;
        } catch (e) {
            console.error('Pony processing failed, using original image:', e);
            ponyImg.src = src;
        }
    };

    // Initial load
    await loadBase(BASE_PONY_SRC);

    // Setup interactions for drag/drop items
    setupPaletteInteractions();

    // Setup clicks for base switchers
    const baseItems = document.querySelectorAll('.palette-item[data-type="base"]');
    baseItems.forEach(item => {
        item.addEventListener('click', () => {
            // Visual feedback
            baseItems.forEach(i => i.style.borderColor = 'transparent');
            item.style.borderColor = 'var(--accent)';
            
            // Load the new base
            loadBase(item.src);
        });
    });

    document.getElementById('clear-btn').addEventListener('click', clearAll);

    document.getElementById('z-up').addEventListener('click', () => adjustZForSelected(1));
    document.getElementById('z-down').addEventListener('click', () => adjustZForSelected(-1));
    document.getElementById('flip-btn').addEventListener('click', flipSelected);
}

init();