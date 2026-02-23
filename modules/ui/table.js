import { state, saveData } from '../state.js';
import { calculateMetrics, getSeColorClass } from '../utils/metrics.js';
import { formatDuration } from '../utils/time.js';
import { renderGrid } from './grid.js';
import { 
    addAwakeningField, addNapField, addCaffeineField, 
    addActivityField, addAlcoholField, addMedsField 
} from './form.js';

export function renderTable() {
    const tbody = document.querySelector('#entries-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const summaryRow = document.getElementById('table-summary-row');

    if (state.entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding: 20px; color: var(--text-muted);">Brak danych do wyświetlenia. Dodaj pierwszy wpis.</td></tr>';
        if (summaryRow) summaryRow.style.display = 'none';
        return;
    }

    if (summaryRow) summaryRow.style.display = 'table-row';

    let totalTib = 0, totalTst = 0, totalQuality = 0;
    const reversed = [...state.entries].reverse();

    reversed.forEach(entry => {
        const m = calculateMetrics(entry);
        totalTib += m.tib;
        totalTst += m.tst;
        totalQuality += entry.sleepQuality || 0;

        const emojiQ = ['😫','😟','😐','🙂','😄'][(entry.sleepQuality || 3) - 1] || '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.timeInBed}</td>
            <td>${entry.lightsOut}</td>
            <td>${m.sol} min</td>
            <td>${m.numAwakenings}</td>
            <td>${m.waso} min</td>
            <td>${entry.finalWakeTime}</td>
            <td>${entry.timeOutOfBed}</td>
            <td>${m.tibFormatted}</td>
            <td>${m.tstFormatted}</td>
            <td class="${getSeColorClass(m.se)}">${m.se}%</td>
            <td>${emojiQ}</td>
            <td class="action-links">
                <button onclick="editEntry('${entry.id}')">Edytuj</button>
                <button class="btn-delete" onclick="deleteEntry('${entry.id}')">Usuń</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const count = state.entries.length;
    const avgTib = totalTib / count;
    const avgTst = totalTst / count;
    const avgSe = avgTib > 0 ? (avgTst / avgTib) * 100 : 0;

    const tibEl = document.getElementById('avg-tib');
    const tstEl = document.getElementById('avg-tst');
    const seEl = document.getElementById('avg-se');
    const qualEl = document.getElementById('avg-quality');

    if (tibEl) tibEl.textContent = formatDuration(avgTib);
    if (tstEl) tstEl.textContent = formatDuration(avgTst);
    if (seEl) { seEl.textContent = avgSe.toFixed(1) + '%'; seEl.className = getSeColorClass(avgSe); }
    if (qualEl) qualEl.textContent = (totalQuality / count).toFixed(1);
}

window.editEntry = function(id) {
    const entry = state.entries.find(e => e.id === id);
    if (!entry) return;

    document.querySelector('.tab-btn[data-target="view-form"]').click();
    document.getElementById('btn-cancel-form').click();

    document.getElementById('entry-id').value = entry.id;
    document.getElementById('f-date').value = entry.date;
    document.getElementById('f-day-off').value = entry.isDayOff ? 'true' : 'false';
    document.getElementById('f-tib-start').value = entry.timeInBed;
    document.getElementById('f-lights-out').value = entry.lightsOut;
    // f-sol will be set later
    document.getElementById('f-wake').value = entry.finalWakeTime;
    document.getElementById('f-tib-end').value = entry.timeOutOfBed;

    const fSol = document.getElementById('f-sol');
    if (fSol) {
        fSol.value = entry.sol;
        fSol.dispatchEvent(new Event('input'));
    }

    if (entry.awakenings) entry.awakenings.forEach(awk => {
        addAwakeningField();
        const divs = document.querySelectorAll('#awakenings-container .dynamic-item');
        const last = divs[divs.length - 1];
        last.querySelector('.awk-time').value = awk.time;
        last.querySelector('.awk-duration').value = awk.duration;
        last.querySelector('.awk-oob').checked = awk.gotOutOfBed;
        last.querySelector('.awk-activity').value = awk.activity || '';
    });

    if (entry.naps) entry.naps.forEach(nap => {
        addNapField();
        const divs = document.querySelectorAll('#naps-container .dynamic-item');
        const last = divs[divs.length - 1];
        last.querySelector('.nap-time').value = nap.time;
        last.querySelector('.nap-duration').value = nap.duration;
        last.querySelector('.nap-intentional').value = nap.intentional ? 'true' : 'false';
    });

    if (entry.caffeine) entry.caffeine.forEach(caf => {
        addCaffeineField();
        const divs = document.querySelectorAll('#caffeine-container .dynamic-item');
        const last = divs[divs.length - 1];
        last.querySelector('.caf-time').value = caf.time;
        last.querySelector('.caf-type').value = caf.type;
    });

    if (entry.physicalActivity) entry.physicalActivity.forEach(act => {
        addActivityField();
        const divs = document.querySelectorAll('#activity-container .dynamic-item');
        const last = divs[divs.length - 1];
        last.querySelector('.act-time').value = act.time;
        last.querySelector('.act-duration').value = act.duration;
        last.querySelector('.act-type').value = act.type;
    });

    document.getElementById('f-screen-time').value = entry.screenTime || '';
    
    // Obsługa starego formatu (checkbox) i nowego (tablica) dla alkoholu
    if (Array.isArray(entry.alcohol)) {
        entry.alcohol.forEach(alc => {
            addAlcoholField();
            const divs = document.querySelectorAll('#alcohol-container .dynamic-item');
            const last = divs[divs.length - 1];
            last.querySelector('.alc-time').value = alc.time;
            last.querySelector('.alc-units').value = alc.units;
            last.querySelector('.alc-type').value = alc.type;
        });
    } else if (entry.alcohol && entry.alcohol.used) {
        // Migracja ze starego formatu
        addAlcoholField();
        const divs = document.querySelectorAll('#alcohol-container .dynamic-item');
        const last = divs[divs.length - 1];
        last.querySelector('.alc-time').value = '21:00'; // Domyślnie
        last.querySelector('.alc-units').value = entry.alcohol.units;
        last.querySelector('.alc-type').value = 'Inny';
    }

    // Obsługa starego formatu (string) i nowego (tablica) dla leków
    if (Array.isArray(entry.meds)) {
        entry.meds.forEach(med => {
            addMedsField();
            const divs = document.querySelectorAll('#meds-container .dynamic-item');
            const last = divs[divs.length - 1];
            last.querySelector('.med-time').value = med.time;
            last.querySelector('.med-name').value = med.name;
        });
    } else if (typeof entry.meds === 'string' && entry.meds.trim() !== '') {
        addMedsField();
        const divs = document.querySelectorAll('#meds-container .dynamic-item');
        const last = divs[divs.length - 1];
        last.querySelector('.med-time').value = '22:00';
        last.querySelector('.med-name').value = entry.meds;
    }

    if (entry.relaxation && entry.relaxation.used) {
        document.getElementById('f-relaxation').checked = true;
        document.getElementById('f-relaxation-time').style.display = 'inline-block';
        document.getElementById('f-relaxation-time').value = entry.relaxation.duration;
    }

    if (entry.sleepQuality) {
        const radio = document.querySelector(`input[name="quality"][value="${entry.sleepQuality}"]`);
        if (radio) radio.checked = true;
    }
    if (entry.mood) {
        const radio = document.querySelector(`input[name="mood"][value="${entry.mood}"]`);
        if (radio) radio.checked = true;
    }

    const fEnergy = document.getElementById('f-energy');
    if (fEnergy) {
        fEnergy.value = entry.energyLevel || 5;
        fEnergy.dispatchEvent(new Event('input'));
    }

    document.getElementById('f-notes').value = entry.notes || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteEntry = function(id) {
    if (confirm('Czy na pewno chcesz usunąć ten wpis?')) {
        state.entries = state.entries.filter(e => e.id !== id);
        saveData();
        renderTable();
        renderGrid();
    }
};
