import { state, getNextId, getSelectedEl, setSelectedEl, getWingDefaultFlip } from './state.js';
import { prepareHitmap, getWingSnapDefinition, getSnapDefinition } from './image-utils.js';

export const STAGE = document.getElementById('stage');

// Helper to apply translation + rotation + scale (+ flip) to all elements of an item
export function applyItemTransform(itemStruct) {
    const rotation = itemStruct.rotation || 0;
    const scale = itemStruct.scale || 1;

    itemStruct.els.forEach(el => {
        const x = parseFloat(el.getAttribute('data-x')) || 0;
        const y = parseFloat(el.getAttribute('data-y')) || 0;
        const flip = el.dataset.flip === 'true';

        const sx = flip ? -scale : scale;
        const sy = scale;

        let transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${sx}, ${sy})`;
        el.style.transform = transform;
    });
}

// Expose core transform function for other modules (e.g. rotation handle)
if (typeof window !== 'undefined') {
    window._applyItemTransformCore = applyItemTransform;
}

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

    // Stage dimensions (responsive)
    const stageW = STAGE.clientWidth || 700;
    const stageH = STAGE.clientHeight || 700;
    
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

    // Find the itemStruct to also grab rotation/scale
    const id = wingEl.dataset.id;
    const itemStruct = state.items.find(i => i.id == id);

    state.calibrationData[baseFilename][filename] = {
        x: Number(normX.toFixed(4)),
        y: Number(normY.toFixed(4)),
        rotation: itemStruct ? Number((itemStruct.rotation || 0).toFixed(2)) : 0,
        scale: itemStruct ? Number((itemStruct.scale || 1).toFixed(2)) : 1
    };
    
    console.log(`Updated calibration for ${baseFilename} -> ${filename}`, state.calibrationData[baseFilename][filename]);
}

export function updateItemCalibration(itemEl) {
    if (!state.currentBasePonySrc) return;
    
    // Extract filenames for cleaner JSON keys
    const src = itemEl.src;
    const filename = src.substring(src.lastIndexOf('/') + 1);
    const baseFilename = state.currentBasePonySrc.substring(state.currentBasePonySrc.lastIndexOf('/') + 1);

    // Calculate center of the element relative to stage
    const rect = itemEl.getBoundingClientRect();
    const stageRect = STAGE.getBoundingClientRect();
    
    const centerX = rect.left + rect.width / 2 - stageRect.left;
    const centerY = rect.top + rect.height / 2 - stageRect.top;

    // Normalize coordinates against the rendered base pony image
    const ponyImg = document.getElementById('base-pony');
    if (!ponyImg) return;

    // Stage dimensions (responsive)
    const stageW = STAGE.clientWidth || 700;
    const stageH = STAGE.clientHeight || 700;
    
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

    // Find the itemStruct to also grab rotation/scale
    const id = itemEl.dataset.id;
    const itemStruct = state.items.find(i => i.id == id);

    state.calibrationData[baseFilename][filename] = {
        x: Number(normX.toFixed(4)),
        y: Number(normY.toFixed(4)),
        rotation: itemStruct ? Number((itemStruct.rotation || 0).toFixed(2)) : 0,
        scale: itemStruct ? Number((itemStruct.scale || 1).toFixed(2)) : 1
    };
    
    console.log(`Updated calibration for ${baseFilename} -> ${filename}`, state.calibrationData[baseFilename][filename]);
}

export function logCalibrationData() {
    console.log("=== WING CALIBRATION DATA ===");
    const debug = {
        calibrationData: state.calibrationData,
        items: state.items.map(item => {
            const masterEl = item.els.find(e => e.dataset.isMaster === 'true') || item.els[0];
            const src = masterEl ? masterEl.src : null;
            return {
                id: item.id,
                type: item.type,
                src,
                rotation: item.rotation || 0,
                scale: item.scale || 1,
                flip: masterEl ? masterEl.dataset.flip === 'true' : false
            };
        })
    };
    const data = JSON.stringify(debug, null, 2);
    console.log(data);
    navigator.clipboard.writeText(data).then(() => {
        alert("Debug JSON (positions/transforms) copied to clipboard!");
    }).catch(err => {
        alert("Debug JSON logged to console.");
        console.error("Failed to copy to clipboard:", err);
    });
}

export async function replaceFirstItemOfType(type, newSrc) {
    const itemStruct = state.items.find(i => i.type === type);
    if (!itemStruct) return false;

    // Ensure hitmap is ready for new image
    await prepareHitmap(newSrc);

    // Update source for all elements in this item (e.g. wing pair)
    for (const el of itemStruct.els) {
        el.src = newSrc;

        // Re-apply default flip based on the new asset
        if (type === 'wing') {
            const shouldFlip = getWingDefaultFlip(newSrc);
            el.dataset.flip = String(shouldFlip);

            // Preserve any existing translation while updating flip
            const x = parseFloat(el.getAttribute('data-x')) || 0;
            const y = parseFloat(el.getAttribute('data-y')) || 0;

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

function getStageCoordinates(normX, normY, naturalRatio) {
    // Stage dimensions (responsive)
    const stageW = STAGE.clientWidth || 700;
    const stageH = STAGE.clientHeight || 700;
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

    wings.forEach(async wingItem => {
        const frontEl = wingItem.els.find(el => el.dataset.isMaster === 'true');
        const backEl = wingItem.els.find(el => el.dataset.isBack === 'true');
        const wingElForSrc = frontEl || backEl;
        if (!wingElForSrc) return;

        const snap = await getWingSnapDefinition(basePonySrc, wingElForSrc.src);
        const coords = getStageCoordinates(snap.x, snap.y, snap.ratio);

        const x = coords.x;
        const y = coords.y;

        if (frontEl) {
            const w = 200; // Hardcoded width in createWingPair
            const h = 200;
            const left = x - w / 2;
            const top = y - h / 2;

            frontEl.style.left = left + 'px';
            frontEl.style.top = top + 'px';
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
            backEl.setAttribute('data-x', 0);
            backEl.setAttribute('data-y', 0);
        }

        // Apply calibrated rotation/scale if present
        wingItem.rotation = typeof snap.rotation === 'number' ? snap.rotation : 0;
        wingItem.scale = typeof snap.scale === 'number' ? snap.scale : 1;

        // Apply shared transform for both elements
        applyItemTransform(wingItem);
    });
}

export async function spawnItem(src, type, x, y) {
    const id = getNextId();
    // Ensure hitmap is prepared
    await prepareHitmap(src);

    if (type === 'wing') {
        const basePony = document.getElementById('base-pony');
        const snap = await getWingSnapDefinition(basePony.src, src);
        const coords = getStageCoordinates(snap.x, snap.y, snap.ratio);
        
        createWingPair(
            id,
            src,
            coords.x,
            coords.y,
            typeof snap.rotation === 'number' ? snap.rotation : 0,
            typeof snap.scale === 'number' ? snap.scale : 1
        );
    } else {
        const rect = STAGE.getBoundingClientRect();

        const basePony = document.getElementById('base-pony');
        let stageX;
        let stageY;
        let initialRotation = 0;
        let initialScale = 1;

        if (basePony) {
            const snap = await getSnapDefinition(basePony.src, src);
            if (snap && typeof snap.x === 'number' && typeof snap.y === 'number') {
                const coords = getStageCoordinates(snap.x, snap.y, snap.ratio);
                stageX = coords.x;
                stageY = coords.y;
                initialRotation = typeof snap.rotation === 'number' ? snap.rotation : 0;
                initialScale = typeof snap.scale === 'number' ? snap.scale : 1;
            } else {
                // Fallback: use drop position
                stageX = x - rect.left;
                stageY = y - rect.top;
            }
        } else {
            // Fallback if base pony missing
            stageX = x - rect.left;
            stageY = y - rect.top;
        }

        createSingleItem(id, src, type, stageX, stageY, initialRotation, initialScale);
    }
}

export function moveItem(id, dx, dy) {
    const itemStruct = state.items.find(i => i.id == id);
    if (!itemStruct) return;

    itemStruct.els.forEach(el => {
        const currentX = parseFloat(el.getAttribute('data-x')) || 0;
        const currentY = parseFloat(el.getAttribute('data-y')) || 0;
        
        const newX = currentX + dx;
        const newY = currentY + dy;
        
        el.setAttribute('data-x', newX);
        el.setAttribute('data-y', newY);
    });

    applyItemTransform(itemStruct);
}

function createSingleItem(id, src, type, x, y, initialRotation = 0, initialScale = 1) {
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

    el.setAttribute('data-x', 0);
    el.setAttribute('data-y', 0);

    const baseZ = 15;
    el.style.zIndex = String(baseZ);

    STAGE.appendChild(el);

    const itemStruct = {
        id,
        type,
        els: [el],
        baseZ,
        zOffset: 0,
        rotation: initialRotation,
        scale: initialScale
    };

    state.items.push(itemStruct);
    applyItemTransform(itemStruct);
}

function createWingPair(id, src, x, y, initialRotation = 0, initialScale = 1) {
    // Determine default flip per asset using centralized settings
    const shouldFlip = getWingDefaultFlip(src);

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

    backEl.setAttribute('data-x', 0);
    backEl.setAttribute('data-y', 0);
    frontEl.setAttribute('data-x', 0);
    frontEl.setAttribute('data-y', 0);

    const backBaseZ = 5;
    const frontBaseZ = 20;
    frontEl.style.zIndex = String(frontBaseZ);
    backEl.style.zIndex = String(backBaseZ);

    STAGE.appendChild(backEl);
    STAGE.appendChild(frontEl);

    const itemStruct = {
        id,
        type: 'wing',
        els: [frontEl, backEl],
        baseZ: 15,
        zOffset: 0,
        rotation: initialRotation,
        scale: initialScale
    };
    state.items.push(itemStruct);
    applyItemTransform(itemStruct);
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
    // Show/hide transform handle
    if (window.updateTransformHandleForSelection) {
        window.updateTransformHandleForSelection(el);
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
    });

    applyItemTransform(itemStruct);
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