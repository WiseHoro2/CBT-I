import { state, saveData } from '../state.js';
import { applyTheme } from './theme.js';
import { renderTable } from './table.js';
import { renderGrid } from './grid.js';

export function loadSettingsForm() {
    const themeEl = document.getElementById('set-theme');
    const ageEl = document.getElementById('set-age');
    if (themeEl) themeEl.value = state.settings.theme;
    if (ageEl) ageEl.value = state.settings.patientAge || 30;
}

window.saveSettings = function() {
    state.settings.theme = document.getElementById('set-theme').value;
    state.settings.patientAge = parseInt(document.getElementById('set-age').value) || 30;
    saveData();
    applyTheme();
    alert('Ustawienia zapisane!');
};

window.exportData = function() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.entries, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `dziennik_cbti_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
};

window.importData = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                if (confirm('Import nadpisze obecne dane. Kontynuować?')) {
                    state.entries = data;
                    saveData();
                    window.location.reload();
                }
            } else {
                alert('Nieprawidłowy format pliku JSON.');
            }
        } catch (err) {
            alert('Błąd przetwarzania: ' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
};

window.resetData = function() {
    if (confirm('UWAGA: Czy na pewno chcesz usunąć wszystkie wpisy? Tej operacji nie można cofnąć!')) {
        state.entries = [];
        saveData();
        renderTable();
        renderGrid();
        alert('Dane zostały wyczyszczone.');
    }
};
