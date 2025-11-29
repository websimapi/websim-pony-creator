import interact from 'interactjs';
import { isOpaqueAtElement, pickUnderlyingOpaqueStageItem } from './image-utils.js';
import { spawnItem, selectElement, deleteItem, STAGE } from './stage-manager.js';

export function setupPaletteInteractions() {
    // Only make items draggable if they are NOT base types
    interact('.palette-item:not([data-type="base"])').draggable({
        inertia: true,
        listeners: {
            start(event) {
                const source = event.target;
                const type = source.dataset.type;
                const src = source.src;

                const ghost = document.createElement('img');
                ghost.src = src;
                ghost.className = 'stage-item';
                ghost.style.position = 'fixed';
                ghost.style.pointerEvents = 'none';
                ghost.style.width = '140px';
                ghost.style.height = '140px';
                ghost.style.left = event.clientX - 70 + 'px';
                ghost.style.top = event.clientY - 70 + 'px';
                ghost.style.opacity = '0.9';
                ghost.style.zIndex = '999';

                if (type === 'wing') {
                    ghost.style.transform = 'scaleX(-1)';
                }

                document.body.appendChild(ghost);

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
            async end(event) {
                const data = event.interaction.data;
                if (data && data.ghost) {
                    const stageRect = STAGE.getBoundingClientRect();
                    const dropX = event.clientX;
                    const dropY = event.clientY;

                    if (
                        dropX >= stageRect.left &&
                        dropX <= stageRect.right &&
                        dropY >= stageRect.top &&
                        dropY <= stageRect.bottom
                    ) {
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

    interact(el)
        .draggable({
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
                        }
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