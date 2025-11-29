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
                "x": 0.1536,
                "y": 0.4069
            },
            "wing_butterfly.png": {
                "x": 0.3262,
                "y": 0.4543
            }
        }
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

