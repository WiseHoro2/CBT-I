import { renderStats } from './stats.js';
import { renderGrid } from './grid.js';
import { renderTable } from './table.js';

export function setupNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const views = document.querySelectorAll('.view');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Opóźnienie renderowania wykresów (canvas musi być widoczny)
            if (targetId === 'view-stats') {
                setTimeout(() => renderStats(14), 50);
            }
            if (targetId === 'view-grid') {
                renderGrid();
            }
            if (targetId === 'view-table') {
                renderTable();
            }
        });
    });
}
