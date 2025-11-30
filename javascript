import { processBasePony, prepareHitmap } from './image-utils.js';
// ... existing code ...

    // Setup clicks for accessories (Switch/Spawn)
    const accessoryItems = document.querySelectorAll('.palette-item:not([data-type="base"])');
    accessoryItems.forEach(item => {
        item.addEventListener('click', async () => {
            if (item.dataset.isDragging) return;

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

    // Pre-warm hitmaps for all non-base palette assets so spawning feels instant
    const nonBasePaletteItems = document.querySelectorAll('.palette-item:not([data-type="base"])');
    nonBasePaletteItems.forEach(img => {
        // Fire-and-forget; don't block UI
        prepareHitmap(img.src).catch(err => console.warn('Hitmap warmup failed for', img.src, err));
    });

import { state, getNextId, getSelectedEl, setSelectedEl, getWingDefaultFlip } from './state.js';
import { getWingSnapDefinition } from './image-utils.js';

export const STAGE = document.getElementById('stage');

export async function replaceFirstItemOfType(type, newSrc) {
    const itemStruct = state.items.find(i => i.type === type);
    if (!itemStruct) return false;

    // Update source for all elements in this item (e.g. wing pair)
    for (const el of itemStruct.els) {
        el.src = newSrc;

        // Re-apply default flip based on the new asset
        if (type === 'wing') {
            const shouldFlip = getWingDefaultFlip(newSrc);
            el.dataset.flip = String(shouldFlip);

            // Rebuild transform via itemStruct to keep rotation/scale consistent
            applyItemTransform(itemStruct);
        }
    }

    // If this is a wing, reapply snap for the new wing asset
    if (type === 'wing') {
        const ponyImg = document.getElementById('base-pony');
        if (ponyImg) {
            await repositionWings(ponyImg.src);
        }
    }

    return true;
}

export async function spawnItem(src, type, x, y) {
    const id = getNextId();

    if (type === 'wing') {
        const basePony = document.getElementById('base-pony');
        const snap = await getWingSnapDefinition(basePony.src, src);
        const coords = getStageCoordinates(snap.x, snap.y, snap.ratio);
        
        createWingPair(id, src, coords.x, coords.y);
    } else {
        const rect = STAGE.getBoundingClientRect();
        // Relative position to stage
        const stageX = x - rect.left;
        const stageY = y - rect.top;
        createSingleItem(id, src, type, stageX, stageY);
    }
}

