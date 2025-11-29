import { state, getNextId, getSelectedEl, setSelectedEl } from './state.js';
import { prepareHitmap, getWingSnapDefinition } from './image-utils.js';
import { makeInteractable } from './interaction-handlers.js';

export const STAGE = document.getElementById('stage');

export function updateWingCalibration(wingEl) {
    if (!state.currentBasePonySrc) return;
    
    // Extract filenames for cleaner JSON keys
    const src = wingEl.src;
    const filename = src.substring(src.lastIndexOf('/') + 1);
    const baseFilename = state.currentBasePonySrc.substring(state.currentBasePonySrc.lastIndexOf('/') + 1);

    // Calculate center of the wing element relative to stage
    const rect = wingEl.getBoundingClientRect();
    const stageRect = STAGE.getBoundingClientRect();
    
    const centerX = rect.left + rect.width / 2 - stageRect.left;
    const centerY = rect.top + rect.height / 2 - stageRect.top;

    // Normalize coordinates against the rendered base pony image
    const ponyImg = document.getElementById('base-pony');
    if (!ponyImg) return;

    // Stage dimensions (fixed)
    const stageW = 700;
    const stageH = 700;
    
    // Determine how the pony image is fitted in the stage
    const naturalW = ponyImg.naturalWidth || 1000;
    const naturalH = ponyImg.naturalHeight || 1000;
    const naturalRatio = naturalW / naturalH;
    const stageRatio = stageW / stageH;

    let renderW, renderH, offsetX, offsetY;

    if (naturalRatio > stageRatio) {
        // Landscape fit
        renderW = stageW;
        renderH = stageW / naturalRatio;
        offsetX = 0;
        offsetY = (stageH - renderH) / 2;
    } else {
        // Portrait fit
        renderH = stageH;
        renderW = stageH * naturalRatio;
        offsetY = 0;
        offsetX = (stageW - renderW) / 2;
    }

    // Calculate normalized position (0.0 to 1.0) relative to the image content
    const normX = (centerX - offsetX) / renderW;
    const normY = (centerY - offsetY) / renderH;

    // Store in state
    if (!state.calibrationData[baseFilename]) {
        state.calibrationData[baseFilename] = {};
    }

    state.calibrationData[baseFilename][filename] = {
        x: Number(normX.toFixed(4)),
        y: Number(normY.toFixed(4))
    };
    
    console.log(`Updated calibration for ${baseFilename} -> ${filename}`, state.calibrationData[baseFilename][filename]);
}

export function logCalibrationData() {
    console.log("=== WING CALIBRATION DATA ===");
    console.log(JSON.stringify(state.calibrationData, null, 2));
    alert("Wing calibration data logged to console.");
}

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

function getStageCoordinates(normX, normY, naturalRatio) {
    // STAGE is 700x700
    const stageW = 700;
    const stageH = 700;
    const stageRatio = stageW / stageH;
    
    // The image is fit with object-fit: contain inside the stage
    // Determine the actual rendered dimensions of the image
    let renderW, renderH, offsetX, offsetY;

    if (naturalRatio > stageRatio) {
        // Image is wider than stage (landscape) - fit to width
        renderW = stageW;
        renderH = stageW / naturalRatio;
        offsetX = 0;
        offsetY = (stageH - renderH) / 2;
    } else {
        // Image is taller than stage (portrait) - fit to height
        renderH = stageH;
        renderW = stageH * naturalRatio;
        offsetY = 0;
        offsetX = (stageW - renderW) / 2;
    }

    return {
        x: offsetX + (normX * renderW),
        y: offsetY + (normY * renderH)
    };
}

export async function repositionWings(basePonySrc) {
    const wings = state.items.filter(i => i.type === 'wing');
    if (wings.length === 0) return;

    const snap = await getWingSnapDefinition(basePonySrc);
    const coords = getStageCoordinates(snap.x, snap.y, snap.ratio);

    wings.forEach(wingItem => {
        // Position elements
        // Wing pair logic in createWingPair puts frontEl at (x - 100, y - 100)
        // and backEl at (x - 100 + 40, y - 100 - 20)
        // relative to the 'center' passed.
        
        // We need to update positions based on new coords.x, coords.y
        const x = coords.x;
        const y = coords.y;
        
        const frontEl = wingItem.els.find(el => el.dataset.isMaster === 'true');
        const backEl = wingItem.els.find(el => el.dataset.isBack === 'true');

        if (frontEl) {
            const w = 200; // Hardcoded width in createWingPair
            const h = 200;
            const left = x - w / 2;
            const top = y - h / 2;
            
            frontEl.style.left = left + 'px';
            frontEl.style.top = top + 'px';
            // Reset transform translation, keep flip
            const flip = frontEl.dataset.flip === 'true' ? ' scaleX(-1)' : '';
            frontEl.style.transform = flip;
            frontEl.setAttribute('data-x', 0);
            frontEl.setAttribute('data-y', 0);
        }

        if (backEl) {
            const w = 200;
            const h = 200;
            const left = x - w / 2 + 40;
            const top = y - h / 2 - 20;

            backEl.style.left = left + 'px';
            backEl.style.top = top + 'px';
            const flip = backEl.dataset.flip === 'true' ? ' scaleX(-1)' : '';
            backEl.style.transform = flip;
            backEl.setAttribute('data-x', 0);
            backEl.setAttribute('data-y', 0);
        }
    });
}

export async function spawnItem(src, type, x, y) {
    const id = getNextId();
    // Ensure hitmap is prepared
    await prepareHitmap(src);

    if (type === 'wing') {
        // Ignore passed x,y for wings, use snap
        const basePony = document.getElementById('base-pony');
        const snap = await getWingSnapDefinition(basePony.src);
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
    // Determine default flip. 
    // User requested "UI facing wrong way" when it was flipped.
    // Resetting to no flip by default for all wings to match natural asset direction.
    const shouldFlip = false;

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