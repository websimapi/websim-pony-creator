export const state = {
    items: [],
    nextId: 1,
    selectedEl: null,
    currentBasePonySrc: null,
    calibrationData: {
        "base-pony.jpeg": {
            "wing.png": {
                "x": 0.3158,
                "y": 0.6062
            },
            "wing_dragon.png": {
                "x": 0.3502,
                "y": 0.4119
            },
            "wing_butterfly.png": {
                "x": 0.3262,
                "y": 0.4543
            }
        }
    },
    // Default flip settings per wing image filename
    wingFlipDefaults: {
        "wing.png": true,           // Rainbow wing should be flipped
        "wing_dragon.png": false,   // Bat/dragon wing uses its natural direction
        "wing_butterfly.png": false // Butterfly wing uses natural direction
    }
};

export function getNextId() {
    return state.nextId++;
}

export function setSelectedEl(el) {
    state.selectedEl = el;
}

export function getSelectedEl() {
    return state.selectedEl;
}

export function getItems() {
    return state.items;
}

export function setItems(newItems) {
    state.items = newItems;
}

// Helper to get default flip for a wing image based on its filename
export function getWingDefaultFlip(src) {
    if (!src) return false;
    const filename = src.substring(src.lastIndexOf('/') + 1);
    return !!state.wingFlipDefaults[filename];
}

