import interact from 'interactjs';

// Configuration
const BASE_PONY_SRC = '/base_pony.jpeg';
const STAGE = document.getElementById('stage');
const DELETE_ZONE = document.createElement('div');

DELETE_ZONE.id = 'delete-zone';
DELETE_ZONE.innerHTML = '';
document.getElementById('stage-container').appendChild(DELETE_ZONE);

// State
let items = [];
let nextId = 1;

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
// Interactions
// ---------------------------------------------------------

function setupPaletteInteractions() {
    const paletteItems = document.querySelectorAll('.palette-item');

    paletteItems.forEach(item => {
        item.addEventListener('pointerdown', (e) => {
            // e.preventDefault();
            // We clone the item to start dragging
            spawnItem(item.src, item.dataset.type, e.clientX, e.clientY);
        });
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
    el.style.width = '80px'; // Initial size

    // Center the spawn
    el.style.left = (x - 40) + 'px';
    el.style.top = (y - 40) + 'px';

    STAGE.appendChild(el);
    makeInteractable(el);

    items.push({ id, type, els: [el] });
}

function createWingPair(id, src, x, y) {
    // Back Wing (Behind pony)
    const backEl = document.createElement('img');
    backEl.src = src;
    backEl.className = `stage-item z-back wing-back`;
    backEl.dataset.id = id;
    backEl.dataset.isBack = 'true';
    backEl.style.width = '100px';
    // Back wing is flipped horizontally and offset slightly
    backEl.style.transform = 'scaleX(-1) translate(20px, 0)'; 
    // Note on transform: scaleX(-1) flips it. The translate might be inverted due to flip.
    // Let's rely on data attributes for storing position and render in loop or just use absolute positioning logic

    // Front Wing (In front of pony) - This is the "Handle"
    const frontEl = document.createElement('img');
    frontEl.src = src;
    frontEl.className = `stage-item z-front`;
    frontEl.dataset.id = id;
    frontEl.dataset.isMaster = 'true'; // This one controls the pair
    frontEl.style.width = '100px';

    // Position
    const w = 100;
    const h = 100; // approximation

    // Initial positions
    const initLeft = (x - w/2);
    const initTop = (y - h/2);

    frontEl.style.left = initLeft + 'px';
    frontEl.style.top = initTop + 'px';

    // The back wing should be positioned relative to the front wing logically
    // But in DOM they are siblings. 
    // Strategy: We will update Back Wing position whenever Front Wing moves.
    // Back wing is usually slightly offset to the left/right depending on perspective.
    // For a side view pony, the back wing attaches at roughly the same shoulder point but appears 'behind'.
    
    backEl.style.left = (initLeft + 20) + 'px'; // Offset for perspective
    backEl.style.top = (initTop - 10) + 'px';

    STAGE.appendChild(backEl);
    STAGE.appendChild(frontEl);

    // Only make the front wing interactive for dragging
    makeInteractable(frontEl, backEl);

    items.push({ id, type: 'wing', els: [frontEl, backEl] });
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
                    var target = event.target;
                    // keep the dragged position in the data-x/data-y attributes
                    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    // translate the element
                    target.style.transform = `translate(${x}px, ${y}px)`;

                    // update the posiion attributes
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);

                    // If there's a slave element (like back wing), move it too
                    if (slaveEl) {
                        // Slave uses same delta
                        // But slave might have its own initial transform (scaleX(-1)). 
                        // We need to preserve its flip.
                        // We can't just set transform because it overwrites scale.
                        // So we use a wrapper approach OR just append translate to the string.
                        // Easier: Use top/left for base position + transform for drag delta.
                        // Wait, interactjs uses transform translate usually.

                        // Let's store slave X/Y too
                        var sx = (parseFloat(slaveEl.getAttribute('data-x')) || 0) + event.dx;
                        var sy = (parseFloat(slaveEl.getAttribute('data-y')) || 0) + event.dy;

                        slaveEl.setAttribute('data-x', sx);
                        slaveEl.setAttribute('data-y', sy);

                        // Slave is flipped.
                        slaveEl.style.transform = `translate(${sx}px, ${sy}px) scaleX(-1)`;
                        // Wait, if we scaleX(-1), the X axis is inverted for the translate inside the transform?
                        // Let's test: scaleX(-1) translate(10px, 0) -> visually moves LEFT by 10px if origin is center.
                        // Actually, CSS transform order matters.
                        // If we do `translate(x,y) scaleX(-1)`, it moves then flips.
                        // If we do `scaleX(-1) translate(x,y)`, it flips axes then moves.
                        // Let's use `translate(${sx}px, ${sy}px) scaleX(-1)` for the slave.
                        slaveEl.style.transform = `translate(${sx}px, ${sy}px) scaleX(-1)`;
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
                    var target = event.target;
                    var x = (parseFloat(target.getAttribute('data-x')) || 0);
                    var y = (parseFloat(target.getAttribute('data-y')) || 0);

                    // update the element's style
                    target.style.width = event.rect.width + 'px';
                    target.style.height = event.rect.height + 'px';

                    // translate when resizing from top or left edges
                    x += event.deltaRect.left;
                    y += event.deltaRect.top;

                    target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);

                    // Resize slave if exists
                    if (slaveEl) {
                        slaveEl.style.width = event.rect.width + 'px';
                        slaveEl.style.height = event.rect.height + 'px';

                        // Slave position logic is complex during resize if not synced perfectly.
                        // Simplified: Just update slave width/height. 
                        // Re-sync position
                        var sx = (parseFloat(slaveEl.getAttribute('data-x')) || 0);
                        var sy = (parseFloat(slaveEl.getAttribute('data-y')) || 0);

                        sx += event.deltaRect.left;
                        sy += event.deltaRect.top;

                        slaveEl.setAttribute('data-x', sx);
                        slaveEl.setAttribute('data-y', sy);

                        slaveEl.style.transform = `translate(${sx}px, ${sy}px) scaleX(-1)`;
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
}

init();