/**
 * Dziennik Snu CBT-I — Główna logika aplikacji (client-side) - zrefaktoryzowana na moduły ES
 */

import { state, loadData } from './modules/state.js';
import { generateMockData } from './modules/data/mockData.js';
import { applyTheme } from './modules/ui/theme.js';
import { setupNavigation } from './modules/ui/navigation.js';
import { setupForm } from './modules/ui/form.js';
import { loadSettingsForm } from './modules/ui/settings.js';
import { renderTable } from './modules/ui/table.js';
import { renderGrid } from './modules/ui/grid.js';
import { renderStats } from './modules/ui/stats.js';
// Import modules that attach functions to the global window object
import './modules/ui/srt.js';

function initApp() {
    loadData();

    if (state.entries.length === 0) {
        generateMockData();
    }

    setupNavigation();
    setupForm();
    loadSettingsForm();
    applyTheme();

    // Renderuj widoki tabelaryczny i graficzny na starcie
    renderTable();
    renderGrid();

    // Statystyki renderowane przy przełączeniu na ten tab (canvas musi być widoczny)

    // Obsługa przycisków zakresu w statystykach
    const btn7 = document.getElementById('btn-stats-7d');
    const btn14 = document.getElementById('btn-stats-14d');
    const btnAll = document.getElementById('btn-stats-all');

    if (btn7 && btn14 && btnAll) {
        const clearActive = () => [btn7, btn14, btnAll].forEach(b => b.classList.remove('active'));
        btn7.addEventListener('click', () => { clearActive(); btn7.classList.add('active'); renderStats(7); });
        btn14.addEventListener('click', () => { clearActive(); btn14.classList.add('active'); renderStats(14); });
        btnAll.addEventListener('click', () => { clearActive(); btnAll.classList.add('active'); renderStats('all'); });
    }

    console.log('Aplikacja CBT-I zainicjalizowana. Liczba wpisów:', state.entries.length);
}

document.addEventListener('DOMContentLoaded', initApp);
