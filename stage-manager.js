import { state, getNextId, getSelectedEl, setSelectedEl } from './state.js';
import { prepareHitmap } from './image-utils.js';
import { makeInteractable } from './interaction-handlers.js';

export const STAGE = document.getElementById('stage');

export async function replaceFirstItemOfType(type, newSrc) {
    const itemStruct = state.items.find(i => i.type === type);
    if (!itemStruct) return false;

    // Ensure hitmap is ready for new image
    await prepareHitmap(newSrc);

    // Update source for all elements in this item (e.g. wing pair)
    for (const el of itemStruct.els) {
        el.src = newSrc;
    }
    return true;
}

export async function spawnItem(src, type, x, y) {
    const rect = STAGE.getBoundingClientRect();

    // Relative position to stage
    const stageX = x - rect.left;
    const stageY = y - rect.top;

    const id = getNextId();

    // Ensure hitmap is prepared
    await prepareHitmap(src);

    if (type === 'wing') {
        createWingPair(id, src, stageX, stageY);
    } else {
        createSingleItem(id, src, type, stageX, stageY);
    }
}

function createSingleItem(id, src, type, x, y) {
    const el = document.createElement('img');
    el.src = src;
    el.className = `stage-item z-front`;
    el.dataset.id = id;
    el.dataset.type = type;
    el.style.width = '160px';
    el.draggable = false;

    // Apply default flip for pink horn
    if (src.includes('horn.png')) {
        el.dataset.flip = 'true';
        el.style.transform = 'scaleX(-1)';
    }

    el.style.left = (x - 80) + 'px';
    el.style.top = (y - 80) + 'px';

    const baseZ = 15;
    el.style.zIndex = String(baseZ);

    STAGE.appendChild(el);
    makeInteractable(el);

    state.items.push({ id, type, els: [el], baseZ, zOffset: 0 });
}

function createWingPair(id, src, x, y) {
    // Determine default flip. Standard wings are flipped by default.
    // Dragon wings (bat wings) are specifically requested to be flipped relative to standard (i.e. not flipped).
    const isDragon = src.includes('wing_dragon.png');
    const shouldFlip = !isDragon;

    const backEl = document.createElement('img');
    backEl.src = src;
    backEl.className = `stage-item z-back wing-back`;
    backEl.dataset.id = id;
    backEl.dataset.isBack = 'true';
    backEl.dataset.flip = String(shouldFlip);
    backEl.dataset.type = 'wing';
    backEl.style.width = '200px';
    backEl.draggable = false;
    backEl.style.pointerEvents = 'none';

    const frontEl = document.createElement('img');
    frontEl.src = src;
    frontEl.className = `stage-item z-front`;
    frontEl.dataset.id = id;
    frontEl.dataset.isMaster = 'true';
    frontEl.dataset.flip = String(shouldFlip);
    frontEl.dataset.type = 'wing';
    frontEl.style.width = '200px';
    frontEl.draggable = false;

    const w = 200;
    const h = 200;

    const initLeft = (x - w / 2);
    const initTop = (y - h / 2);

    frontEl.style.left = initLeft + 'px';
    frontEl.style.top = initTop + 'px';

    backEl.style.left = (initLeft + 40) + 'px';
    backEl.style.top = (initTop - 20) + 'px';

    if (shouldFlip) {
        frontEl.style.transform = 'scaleX(-1)';
        backEl.style.transform = 'scaleX(-1)';
    }

    const backBaseZ = 5;
    const frontBaseZ = 20;
    frontEl.style.zIndex = String(frontBaseZ);
    backEl.style.zIndex = String(backBaseZ);

    STAGE.appendChild(backEl);
    STAGE.appendChild(frontEl);

    makeInteractable(frontEl, backEl);

    state.items.push({ id, type: 'wing', els: [frontEl, backEl], baseZ: 15, zOffset: 0 });
}

export function selectElement(el) {
    const selectedEl = getSelectedEl();
    if (selectedEl === el) return;

    if (selectedEl) {
        selectedEl.classList.remove('selected');
    }
    setSelectedEl(el);
    if (el) {
        el.classList.add('selected');
    }
}

export function flipSelected() {
    const selectedEl = getSelectedEl();
    if (!selectedEl) return;

    const id = selectedEl.dataset.id;
    const itemStruct = state.items.find(i => i.id == id);
    if (!itemStruct) return;

    itemStruct.els.forEach(el => {
        const currentFlip = el.dataset.flip === 'true';
        const newFlip = !currentFlip;
        
        el.dataset.flip = String(newFlip);

        // Update transform preserving translation
        const x = parseFloat(el.getAttribute('data-x')) || 0;
        const y = parseFloat(el.getAttribute('data-y')) || 0;
        
        let transform = `translate(${x}px, ${y}px)`;
        if (newFlip) {
            transform += ' scaleX(-1)';
        }
        el.style.transform = transform;
    });
}

export function deleteItem(id) {
    const itemIndex = state.items.findIndex(i => i.id == id);
    if (itemIndex > -1) {
        const itemStruct = state.items[itemIndex];
        itemStruct.els.forEach(el => el.remove());
        state.items.splice(itemIndex, 1);
    }
}

export function clearAll() {
    state.items.forEach(itemStruct => {
        itemStruct.els.forEach(el => el.remove());
    });
    // Reset array in place or setter
    state.items.length = 0;

    const selectedEl = getSelectedEl();
    if (selectedEl) {
        selectedEl.classList.remove('selected');
        setSelectedEl(null);
    }
}

export function adjustZForSelected(delta) {
    const selectedEl = getSelectedEl();
    if (!selectedEl) return;

    const id = selectedEl.dataset.id;
    const itemStruct = state.items.find(i => i.id == id);
    if (!itemStruct) return;

    const newOffset = clamp(
        (itemStruct.zOffset || 0) + delta,
        -10,
        10
    );
    itemStruct.zOffset = newOffset;

    if (itemStruct.type === 'wing') {
        itemStruct.els.forEach(el => {
            const isBack = el.dataset.isBack === 'true';
            const baseZ = isBack ? 5 : 20;
            const finalZ = baseZ + newOffset;
            el.style.zIndex = String(finalZ);
        });
    } else {
        const baseZ = itemStruct.baseZ || 15;
        const finalZ = baseZ + newOffset;

        itemStruct.els.forEach(el => {
            el.style.zIndex = String(finalZ);
        });
    }
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}