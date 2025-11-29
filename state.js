export const state = {
    items: [],
    nextId: 1,
    selectedEl: null,
    currentBasePonySrc: null,
    calibrationData: {}
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

