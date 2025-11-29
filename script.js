import { processBasePony } from './image-utils.js';
import { setupPaletteInteractions } from './interaction-handlers.js';
import { clearAll, adjustZForSelected, flipSelected, replaceFirstItemOfType, spawnItem, STAGE } from './stage-manager.js';

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

    // Setup Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    const categories = document.querySelectorAll('.palette-category');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            categories.forEach(c => c.classList.remove('active'));

            // Activate selected
            tab.classList.add('active');
            const catId = `cat-${tab.dataset.category}`;
            document.getElementById(catId).classList.add('active');
        });
    });

    // Setup clicks for base switchers (Switch Horse)
    const baseItems = document.querySelectorAll('.palette-item[data-type="base"]');
    baseItems.forEach(item => {
        item.addEventListener('click', () => {
            baseItems.forEach(i => i.style.borderColor = 'transparent');
            item.style.borderColor = 'var(--accent)';
            loadBase(item.src);
        });
    });

    // Setup clicks for accessories (Switch/Spawn)
    const accessoryItems = document.querySelectorAll('.palette-item:not([data-type="base"])');
    accessoryItems.forEach(item => {
        item.addEventListener('click', async () => {
            const type = item.dataset.type;
            const src = item.src;
            
            // Visual feedback
            item.style.transform = 'scale(0.9)';
            setTimeout(() => item.style.transform = '', 100);

            // Logic: 
            // Wings/Horns: Try to replace first. If not found, spawn.
            // Marks: Always spawn (allow multiple).
            let replaced = false;

            if (type === 'wing' || type === 'horn') {
                replaced = await replaceFirstItemOfType(type, src);
            }

            if (!replaced) {
                // Spawn at center of stage
                const rect = STAGE.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                
                // Add some random offset so they don't stack perfectly
                const offset = (Math.random() - 0.5) * 20;
                
                await spawnItem(src, type, cx + offset, cy + offset);
            }
        });
    });

    document.getElementById('clear-btn').addEventListener('click', clearAll);

    document.getElementById('z-up').addEventListener('click', () => adjustZForSelected(1));
    document.getElementById('z-down').addEventListener('click', () => adjustZForSelected(-1));
    document.getElementById('flip-btn').addEventListener('click', flipSelected);
}

init();