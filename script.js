import interact from 'interactjs';

// Configuration
const BASE_PONY_SRC = '/base-pony.jpeg';
const STAGE = document.getElementById('stage');
const DELETE_ZONE = document.createElement('div');

DELETE_ZONE.id = 'delete-zone';
DELETE_ZONE.innerHTML = '';
document.getElementById('stage-container').appendChild(DELETE_ZONE);

// State
let items = [];
let nextId = 1;
let selectedEl = null;

// Initialize
async function init() {
    const ponyImg = document.getElementById('base-pony');

    try {
        // 1. Process Base Pony to remove background
        const processedPonyUrl = await processBasePony(BASE_PONY_SRC);
        ponyImg.src = processedPonyUrl;
    } catch (e) {
        // Fallback: if processing fails for any reason, show the original pony image
        console.error('Pony processing failed, using original image:', e);
        ponyImg.src = BASE_PONY_SRC;
    }

    // 2. Setup Palette Dragging
    setupPaletteInteractions();

    // 3. Setup Stage Interactions (Existing items)
    setupStageInteractions();

    // 4. UI Listeners
    document.getElementById('clear-btn').addEventListener('click', clearAll);

    // Z-index controls
    document.getElementById('horn-z-up').addEventListener('click', () => adjustZForType('horn', 1));
    document.getElementById('horn-z-down').addEventListener('click', () => adjustZForType('horn', -1));
    document.getElementById('mark-z-up').addEventListener('click', () => adjustZForType('mark', 1));
    document.getElementById('mark-z-down').addEventListener('click', () => adjustZForType('mark', -1));
}

// ---------------------------------------------------------
// Image Processing
// ---------------------------------------------------------
function processBasePony(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Draw image
            ctx.drawImage(img, 0, 0);

            // Get data
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = frame.data;

            // Simple grey removal logic (assuming top-left pixel is background color reference, or hardcoded)
            // The prompt says "plain grey background". Let's sample the top-left pixel.
            const br = data[0];
            const bg = data[1];
            const bb = data[2];

            // Tolerance
            const t = 20; 

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // If pixel is close to background color
                if (Math.abs(r - br) < t && Math.abs(g - bg) < t && Math.abs(b - bb) < t) {
                    data[i + 3] = 0; // Set alpha to 0
                }
            }

            ctx.putImageData(frame, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.onerror = reject;
    });
}

// ---------------------------------------------------------
// Z-index helpers
// ---------------------------------------------------------
function selectElement(el) {
    if (selectedEl === el) return;

    if (selectedEl) {
        selectedEl.classList.remove('selected');
    }
    selectedEl = el;
    if (selectedEl) {
        selectedEl.classList.add('selected');
    }
}

function adjustZForType(type, delta) {
    if (!selectedEl) return;
    const itemType = selectedEl.dataset.type;
    if (itemType !== type) return;

    const id = selectedEl.dataset.id;
    const itemStruct = items.find(i => i.id == id);
    if (!itemStruct) return;

    const newOffset = clamp(
        (itemStruct.zOffset || 0) + delta,
        -10,
        10
    );
    itemStruct.zOffset = newOffset;

    const baseZ = itemStruct.baseZ || 20;
    const finalZ = baseZ + newOffset;

    itemStruct.els.forEach(el => {
        el.style.zIndex = finalZ;
    });
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

// ---------------------------------------------------------
// Interactions
// ---------------------------------------------------------

function setupStageInteractions() {
    // Currently no pre-existing items on stage at load,
    // but this function is here to avoid runtime errors
    // and can be extended later if needed.
}

function setupPaletteInteractions() {
    // Use Interact.js to drag from palette onto the stage (touch + mouse)
    interact('.palette-item').draggable({
        inertia: true,
        listeners: {
            start(event) {
                const source = event.target;
                const type = source.dataset.type;
                const src = source.src;

                // Create a floating ghost element following the finger/mouse
                const ghost = document.createElement('img');
                ghost.src = src;
                ghost.className = 'stage-item'; // reuse styling for visibility
                ghost.style.position = 'fixed';
                ghost.style.pointerEvents = 'none';
                ghost.style.width = '140px';
                ghost.style.height = '140px';
                ghost.style.left = event.clientX - 70 + 'px';
                ghost.style.top = event.clientY - 70 + 'px';
                ghost.style.opacity = '0.9';
                ghost.style.zIndex = '999';

                // Flip the ghost wing horizontally so it matches the palette wing
                if (type === 'wing') {
                    ghost.style.transform = 'scaleX(-1)';
                }

                document.body.appendChild(ghost);

                // Attach data to interaction for later
                event.interaction.data = {
                    type,
                    src,
                    ghost
                };
            },
            move(event) {
                const data = event.interaction.data;
                if (!data || !data.ghost) return;

                const ghost = data.ghost;
                ghost.style.left = event.clientX - 70 + 'px';
                ghost.style.top = event.clientY - 70 + 'px';
            },
            end(event) {
                const data = event.interaction.data;
                if (data && data.ghost) {
                    // Determine if dropped over stage
                    const stageRect = STAGE.getBoundingClientRect();
                    const dropX = event.clientX;
                    const dropY = event.clientY;

                    if (
                        dropX >= stageRect.left &&
                        dropX <= stageRect.right &&
                        dropY >= stageRect.top &&
                        dropY <= stageRect.bottom
                    ) {
                        // Spawn item in stage coordinates
                        spawnItem(data.src, data.type, dropX, dropY);
                    }

                    // Clean up ghost
                    data.ghost.remove();
                }

                event.interaction.data = null;
            }
        }
    });
}

function spawnItem(src, type, x, y) {
    const rect = STAGE.getBoundingClientRect();

    // Relative position to stage
    const stageX = x - rect.left;
    const stageY = y - rect.top;

    const id = nextId++;

    // Create DOM elements
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
    el.style.width = '160px'; // doubled size

    // Center the spawn
    el.style.left = (x - 80) + 'px';
    el.style.top = (y - 80) + 'px';

    // Base z-index for horns/marks
    const baseZ = 20;
    el.style.zIndex = String(baseZ);

    // Click/tap selection
    el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        selectElement(el);
    });

    STAGE.appendChild(el);
    makeInteractable(el);

    items.push({ id, type, els: [el], baseZ, zOffset: 0 });
}

function createWingPair(id, src, x, y) {
    // Back Wing (Behind pony)
    const backEl = document.createElement('img');
    backEl.src = src;
    backEl.className = `stage-item z-back wing-back`;
    backEl.dataset.id = id;
    backEl.dataset.isBack = 'true';
    backEl.dataset.flip = 'true'; // mark as flipped
    backEl.dataset.type = 'wing';
    backEl.style.width = '200px';

    // Front Wing (In front of pony) - This is the "Handle"
    const frontEl = document.createElement('img');
    frontEl.src = src;
    frontEl.className = `stage-item z-front`;
    frontEl.dataset.id = id;
    frontEl.dataset.isMaster = 'true'; // This one controls the pair
    frontEl.dataset.flip = 'true';     // mark as flipped
    frontEl.dataset.type = 'wing';
    frontEl.style.width = '200px';

    // Position
    const w = 200;
    const h = 200; // approximation

    // Initial positions in stage coords
    const initLeft = (x - w / 2);
    const initTop = (y - h / 2);

    frontEl.style.left = initLeft + 'px';
    frontEl.style.top = initTop + 'px';

    // Back wing offset for depth, behind pony
    backEl.style.left = (initLeft + 40) + 'px';
    backEl.style.top = (initTop - 20) + 'px';

    // Initial visual flip before first drag
    frontEl.style.transform = 'scaleX(-1)';
    backEl.style.transform = 'scaleX(-1)';

    // Click/tap selection on front wing
    frontEl.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        selectElement(frontEl);
    });

    STAGE.appendChild(backEl);
    STAGE.appendChild(frontEl);

    // Only make the front wing interactive for dragging
    makeInteractable(frontEl, backEl);

    items.push({ id, type: 'wing', els: [frontEl, backEl], baseZ: 20, zOffset: 0 });
}

function makeInteractable(el, slaveEl = null) {
    interact(el)
        .draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: false
                })
            ],
            autoScroll: true,
            listeners: {
                start(event) {
                    DELETE_ZONE.classList.add('active');
                },
                move(event) {
                    const target = event.target;

                    // Move main element using left/top
                    const currentLeft = parseFloat(target.style.left) || 0;
                    const currentTop = parseFloat(target.style.top) || 0;
                    const newLeft = currentLeft + event.dx;
                    const newTop = currentTop + event.dy;

                    target.style.left = newLeft + 'px';
                    target.style.top = newTop + 'px';

                    // Preserve flip state
                    if (target.dataset.flip === 'true') {
                        target.style.transform = 'scaleX(-1)';
                    } else {
                        target.style.transform = '';
                    }

                    // If there's a slave element (like back wing), move it too
                    if (slaveEl) {
                        const sCurrentLeft = parseFloat(slaveEl.style.left) || 0;
                        const sCurrentTop = parseFloat(slaveEl.style.top) || 0;
                        const sNewLeft = sCurrentLeft + event.dx;
                        const sNewTop = sCurrentTop + event.dy;

                        slaveEl.style.left = sNewLeft + 'px';
                        slaveEl.style.top = sNewTop + 'px';

                        if (slaveEl.dataset.flip === 'true') {
                            slaveEl.style.transform = 'scaleX(-1)';
                        } else {
                            slaveEl.style.transform = '';
                        }
                    }

                    // Delete Zone Check
                    const dzRect = DELETE_ZONE.getBoundingClientRect();
                    const elRect = target.getBoundingClientRect();

                    if (isOverlapping(dzRect, elRect)) {
                        DELETE_ZONE.classList.add('hover');
                    } else {
                        DELETE_ZONE.classList.remove('hover');
                    }
                },
                end(event) {
                    DELETE_ZONE.classList.remove('active');
                    DELETE_ZONE.classList.remove('hover');

                    const dzRect = DELETE_ZONE.getBoundingClientRect();
                    const elRect = event.target.getBoundingClientRect();

                    if (isOverlapping(dzRect, elRect)) {
                        deleteItem(event.target.dataset.id);
                    }
                }
            }
        })
        .resizable({
            // resize from all edges and corners
            edges: { left: true, right: true, bottom: true, top: true },

            listeners: {
                move: function (event) {
                    const target = event.target;

                    // Current left/top
                    let x = parseFloat(target.style.left) || 0;
                    let y = parseFloat(target.style.top) || 0;

                    // update the element's size
                    target.style.width = event.rect.width + 'px';
                    target.style.height = event.rect.height + 'px';

                    // move when resizing from top or left edges
                    x += event.deltaRect.left;
                    y += event.deltaRect.top;

                    target.style.left = x + 'px';
                    target.style.top = y + 'px';

                    if (target.dataset.flip === 'true') {
                        target.style.transform = 'scaleX(-1)';
                    } else {
                        target.style.transform = '';
                    }

                    // Resize/move slave if exists
                    if (slaveEl) {
                        let sx = parseFloat(slaveEl.style.left) || 0;
                        let sy = parseFloat(slaveEl.style.top) || 0;

                        slaveEl.style.width = event.rect.width + 'px';
                        slaveEl.style.height = event.rect.height + 'px';

                        sx += event.deltaRect.left;
                        sy += event.deltaRect.top;

                        slaveEl.style.left = sx + 'px';
                        slaveEl.style.top = sy + 'px';

                        if (slaveEl.dataset.flip === 'true') {
                            slaveEl.style.transform = 'scaleX(-1)';
                        } else {
                            slaveEl.style.transform = '';
                        }
                    }
                }
            },
            modifiers: [
                // keep the edges inside the parent
                interact.modifiers.restrictEdges({
                    outer: 'parent'
                }),
                // minimum size
                interact.modifiers.restrictSize({
                    min: { width: 20, height: 20 }
                })
            ],
            inertia: true
        });
}

function isOverlapping(r1, r2) {
    return !(r2.left > r1.right || 
             r2.right < r1.left || 
             r2.top > r1.bottom || 
             r2.bottom < r1.top);
}

function deleteItem(id) {
    const itemIndex = items.findIndex(i => i.id == id);
    if (itemIndex > -1) {
        const itemStruct = items[itemIndex];
        itemStruct.els.forEach(el => el.remove());
        items.splice(itemIndex, 1);
    }
}

function clearAll() {
    items.forEach(itemStruct => {
        itemStruct.els.forEach(el => el.remove());
    });
    items = [];
    if (selectedEl) {
        selectedEl.classList.remove('selected');
        selectedEl = null;
    }
}

init();