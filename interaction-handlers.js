import interact from 'interactjs';
import { isOpaqueAtElement, pickUnderlyingOpaqueStageItem } from './image-utils.js';
import { spawnItem, selectElement, deleteItem, STAGE, updateWingCalibration } from './stage-manager.js';

export function setupPaletteInteractions() {
    // Only make items draggable if they are NOT base types
    interact('.palette-item:not([data-type="base"])').draggable({
        inertia: true,
        startAxis: 'y',
        lockAxis: false,
        listeners: {
            start(event) {
                const source = event.target;
                const type = source.dataset.type;
                const src = source.src;

                // Determine input type to apply offset for visibility on touch
                const pointerType = event.pointerType || 'mouse';
                const isTouch = pointerType !== 'mouse';
                const yOffset = isTouch ? 80 : 0;

                const ghostContainer = document.createElement('div');
                ghostContainer.className = 'stage-item'; // Re-use class for consistency
                ghostContainer.style.position = 'fixed';
                ghostContainer.style.pointerEvents = 'none';
                ghostContainer.style.zIndex = '999';
                ghostContainer.style.left = event.clientX + 'px';
                ghostContainer.style.top = (event.clientY - yOffset) + 'px';
                ghostContainer.style.transform = 'translate(-50%, -50%)'; // Center
                ghostContainer.style.display = 'flex';
                ghostContainer.style.justifyContent = 'center';
                ghostContainer.style.alignItems = 'center';

                if (type === 'wing') {
                    // Create visual pair for dragging
                    const w = 200;
                    const h = 200;
                    ghostContainer.style.width = w + 'px';
                    ghostContainer.style.height = h + 'px';

                    const back = document.createElement('img');
                    back.src = src;
                    back.style.position = 'absolute';
                    back.style.width = '100%';
                    back.style.height = '100%';
                    back.style.left = '40px';
                    back.style.top = '-20px';
                    back.style.filter = 'brightness(0.8)';
                    
                    const front = document.createElement('img');
                    front.src = src;
                    front.style.position = 'absolute';
                    front.style.width = '100%';
                    front.style.height = '100%';
                    front.style.left = '0';
                    front.style.top = '0';

                    // No flip by default (matching stage-manager update)

                    ghostContainer.appendChild(back);
                    ghostContainer.appendChild(front);
                } else {
                    const img = document.createElement('img');
                    img.src = src;
                    img.style.width = '160px';
                    img.style.height = 'auto';

                    if (src.includes('horn.png')) {
                        img.style.transform = 'scaleX(-1)';
                    }
                    ghostContainer.appendChild(img);
                }

                document.body.appendChild(ghostContainer);

                event.interaction.data = {
                    type,
                    src,
                    ghost: ghostContainer,
                    yOffset
                };
            },
            move(event) {
                const data = event.interaction.data;
                if (!data || !data.ghost) return;

                const yOffset = data.yOffset || 0;
                const ghost = data.ghost;
                ghost.style.left = event.clientX + 'px';
                ghost.style.top = (event.clientY - yOffset) + 'px';
            },
            async end(event) {
                const data = event.interaction.data;
                if (data && data.ghost) {
                    const yOffset = data.yOffset || 0;
                    
                    // We drop where the ghost center was
                    const dropX = event.clientX;
                    const dropY = event.clientY - yOffset;

                    const paletteRect = document.getElementById('palette').getBoundingClientRect();
                    
                    // Allow dropping anywhere in the game area (above palette)
                    if (dropY < paletteRect.top) {
                        await spawnItem(data.src, data.type, dropX, dropY);
                    }
                    data.ghost.remove();
                }
                event.interaction.data = null;
            }
        }
    });
}

function isCenterOverlapping(zoneRect, itemRect) {
    const cx = itemRect.left + (itemRect.width / 2);
    const cy = itemRect.top + (itemRect.height / 2);

    return (
        cx >= zoneRect.left &&
        cx <= zoneRect.right &&
        cy >= zoneRect.top &&
        cy <= zoneRect.bottom
    );
}

export function makeInteractable(el, slaveEl = null) {
    const DELETE_ZONE = document.getElementById('delete-zone');

    // Wings should not be draggable ("snap to position rather then move anywhere")
    const isWing = el.dataset.type === 'wing';

    interact(el)
        .draggable({
            enabled: !isWing,
            inertia: true,
            autoScroll: true,
            listeners: {
                start(event) {
                   const target = event.target;
                   const clientX = event.clientX;
                   const clientY = event.clientY;

                   if (!isOpaqueAtElement(target, clientX, clientY)) {
                       const underlying = pickUnderlyingOpaqueStageItem(target, clientX, clientY);
                       if (underlying) {
                           selectElement(underlying);
                           try {
                               event.interaction.start(
                                   {
                                       name: 'drag',
                                       axis: 'xy'
                                   },
                                   interact(underlying),
                                   underlying
                               );
                           } catch (e) {
                               console.warn('Failed to reroute drag', e);
                               event.interaction.stop();
                           }
                       } else {
                           event.interaction.stop();
                       }
                       return;
                   }

                   event.interaction.dragMeta = {
                       startTime: Date.now()
                   };

                   if (DELETE_ZONE) DELETE_ZONE.classList.add('active');
                },
                move(event) {
                    const meta = event.interaction.dragMeta;
                    if (meta) {
                        const elapsed = Date.now() - meta.startTime;
                        if (elapsed < 150) {
                            return;
                        }
                    }

                    var target = event.target;
                    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    let transform = `translate(${x}px, ${y}px)`;
                    if (target.dataset.flip === 'true') {
                        transform += ' scaleX(-1)';
                    }
                    target.style.transform = transform;

                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);

                    if (slaveEl) {
                        var sx = (parseFloat(slaveEl.getAttribute('data-x')) || 0) + event.dx;
                        var sy = (parseFloat(slaveEl.getAttribute('data-y')) || 0) + event.dy;

                        slaveEl.setAttribute('data-x', sx);
                        slaveEl.setAttribute('data-y', sy);

                        let sTransform = `translate(${sx}px, ${sy}px)`;
                        if (slaveEl.dataset.flip === 'true') {
                            sTransform += ' scaleX(-1)';
                        }
                        slaveEl.style.transform = sTransform;
                    }

                    if (DELETE_ZONE) {
                        const dzRect = DELETE_ZONE.getBoundingClientRect();
                        const elRect = target.getBoundingClientRect();

                        if (isCenterOverlapping(dzRect, elRect)) {
                            DELETE_ZONE.classList.add('hover');
                        } else {
                            DELETE_ZONE.classList.remove('hover');
                        }
                    }
                },
                end(event) {
                    if (DELETE_ZONE) {
                        DELETE_ZONE.classList.remove('active');
                        DELETE_ZONE.classList.remove('hover');

                        const dzRect = DELETE_ZONE.getBoundingClientRect();
                        const elRect = event.target.getBoundingClientRect();

                        if (isCenterOverlapping(dzRect, elRect)) {
                            deleteItem(event.target.dataset.id);
                            return; // Stop here if deleted
                        }
                    }

                    // Update calibration if a wing was moved
                    if (event.target.dataset.type === 'wing') {
                        updateWingCalibration(event.target);
                    }

                    if (event.interaction.dragMeta) {
                        event.interaction.dragMeta = null;
                    }
                }
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            margin: 4,

            listeners: {
                move: function (event) {
                    var target = event.target;
                    var x = (parseFloat(target.getAttribute('data-x')) || 0);
                    var y = (parseFloat(target.getAttribute('data-y')) || 0);

                    target.style.width = event.rect.width + 'px';
                    target.style.height = event.rect.height + 'px';

                    x += event.deltaRect.left;
                    y += event.deltaRect.top;

                    let transform = 'translate(' + x + 'px,' + y + 'px)';
                    if (target.dataset.flip === 'true') {
                        transform += ' scaleX(-1)';
                    }
                    target.style.transform = transform;

                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);

                    if (slaveEl) {
                        slaveEl.style.width = event.rect.width + 'px';
                        slaveEl.style.height = event.rect.height + 'px';

                        var sx = (parseFloat(slaveEl.getAttribute('data-x')) || 0);
                        var sy = (parseFloat(slaveEl.getAttribute('data-y')) || 0);

                        sx += event.deltaRect.left;
                        sy += event.deltaRect.top;

                        slaveEl.setAttribute('data-x', sx);
                        slaveEl.setAttribute('data-y', sy);

                        let sTransform = `translate(${sx}px, ${sy}px)`;
                        if (slaveEl.dataset.flip === 'true') {
                            sTransform += ' scaleX(-1)';
                        }
                        slaveEl.style.transform = sTransform;
                    }
                }
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 30, height: 30 }
                })
            ],
            inertia: true
        })
        .on('tap', function (event) {
            const target = event.target;
            const clientX = event.clientX;
            const clientY = event.clientY;

            if (!isOpaqueAtElement(target, clientX, clientY)) {
                const underlying = pickUnderlyingOpaqueStageItem(target, clientX, clientY);
                if (underlying) {
                    selectElement(underlying);
                } else {
                    selectElement(null);
                }
                event.preventDefault();
                return;
            }

            selectElement(target);
            event.preventDefault();
        });
}