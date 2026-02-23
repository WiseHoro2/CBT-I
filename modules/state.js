export const state = {
    entries: [],
    settings: {
        theme: 'dark',
        gridStartHour: 16,
        gridResolution: 30,
        patientName: '',
        patientAge: 30
    }
};

export const STORAGE_KEYS = {
    ENTRIES: 'cbti_entries',
    SETTINGS: 'cbti_settings'
};

export function loadData() {
    const savedEntries = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedEntries) state.entries = JSON.parse(savedEntries);
    if (savedSettings) state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
}

export function saveData() {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(state.entries));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
}
