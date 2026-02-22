/**
 * Dziennik Snu CBT-I — Główna logika aplikacji (client-side)
 */

// ==========================================
// STAN APLIKACJI
// ==========================================
const state = {
    entries: [],
    settings: {
        theme: 'dark',
        gridStartHour: 5,
        gridResolution: 30,
        patientName: '',
        patientAge: 30
    }
};

const STORAGE_KEYS = {
    ENTRIES: 'cbti_entries',
    SETTINGS: 'cbti_settings'
};

// ==========================================
// LOGIKA POMOCNICZA (CZAS)
// ==========================================

function timeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
}

function minutesToTimeStr(minutes) {
    const total = ((minutes % 1440) + 1440) % 1440; // zawijaj przez 24h
    const h = Math.floor(total / 60);
    const m = Math.floor(total % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatDuration(minutes) {
    const abs = Math.abs(Math.round(minutes));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Różnica między startTime a endTime w minutach (uwzględnia przejście przez północ).
 */
function getDurationInMinutes(startTimeStr, endTimeStr) {
    const start = timeToMinutes(startTimeStr);
    const end = timeToMinutes(endTimeStr);
    if (end < start) {
        return (1440 - start) + end;
    }
    return end - start;
}

// ==========================================
// OBLICZENIA METRYK CBT-I
// ==========================================

function calculateMetrics(entry) {
    const tibMinutes = getDurationInMinutes(entry.timeInBed, entry.timeOutOfBed);
    const solMinutes = parseInt(entry.sol) || 0;

    let wasoMinutes = 0;
    if (entry.awakenings && entry.awakenings.length > 0) {
        wasoMinutes = entry.awakenings.reduce((sum, awk) => sum + (parseInt(awk.duration) || 0), 0);
    }

    const timeFromLightsOutToWake = getDurationInMinutes(entry.lightsOut, entry.finalWakeTime);
    let tstMinutes = timeFromLightsOutToWake - solMinutes - wasoMinutes;
    if (tstMinutes < 0) tstMinutes = 0;

    const sePercent = tibMinutes > 0 ? (tstMinutes / tibMinutes) * 100 : 0;

    let totalNapTime = 0;
    if (entry.naps && entry.naps.length > 0) {
        totalNapTime = entry.naps.reduce((sum, nap) => sum + (parseInt(nap.duration) || 0), 0);
    }

    return {
        tib: tibMinutes,
        tibFormatted: formatDuration(tibMinutes),
        sol: solMinutes,
        waso: wasoMinutes,
        tst: tstMinutes,
        tstFormatted: formatDuration(tstMinutes),
        se: parseFloat(sePercent.toFixed(1)),
        numAwakenings: entry.awakenings ? entry.awakenings.length : 0,
        napsDuration: totalNapTime
    };
}

function getSeColorClass(se) {
    if (se >= 90) return 'text-success';
    if (se >= 85) return 'text-warning';
    return 'text-danger';
}

// ==========================================
// LOCALSTORAGE
// ==========================================

function loadData() {
    const savedEntries = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedEntries) state.entries = JSON.parse(savedEntries);
    if (savedSettings) state.settings = { ...state.settings, ...JSON.parse(savedSettings) };
}

function saveData() {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(state.entries));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
}

// ==========================================
// MOTYW
// ==========================================

function applyTheme() {
    document.body.className = `theme-${state.settings.theme}`;
}

// ==========================================
// NAWIGACJA
// ==========================================

function setupNavigation() {
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

// ==========================================
// DANE TESTOWE (14 dni pacjenta z bezsennością)
// ==========================================

function generateMockData() {
    console.log("Generowanie danych testowych (14 dni)...");
    const mockEntries = [];
    const today = new Date();

    for (let i = 14; i >= 1; i--) {
        const entryDate = new Date(today);
        entryDate.setDate(today.getDate() - i);
        const dateStr = entryDate.toISOString().split('T')[0];

        const isGoodNight = (i === 7); // 7 dni temu — dobra noc (efekt presji snu)

        const bedHour = isGoodNight ? 23 : (22 + Math.floor(Math.random() * 2));
        const bedMinuteOptions = [0, 15, 30, 45];
        const bedMinute = isGoodNight ? 0 : bedMinuteOptions[Math.floor(Math.random() * 4)];
        const sol = isGoodNight ? 15 : (30 + Math.floor(Math.random() * 4) * 15);

        const wakeHour = 6;
        const wakeMinuteOptions = [0, 15, 30];
        const wakeMinute = wakeMinuteOptions[Math.floor(Math.random() * 3)];
        const outOfBedMinute = Math.min(wakeMinute + 15, 59);

        const awakenings = [];
        const numAwakenings = isGoodNight ? 0 : (1 + Math.floor(Math.random() * 3));
        for (let j = 0; j < numAwakenings; j++) {
            const awkHour = (bedHour + 2 + j) % 24;
            const awkDuration = 10 + Math.floor(Math.random() * 4) * 5;
            awakenings.push({
                time: `${awkHour.toString().padStart(2, '0')}:00`,
                duration: awkDuration,
                gotOutOfBed: Math.random() > 0.5,
                activity: Math.random() > 0.5 ? 'Czytanie' : ''
            });
        }

        const naps = [];
        if (!isGoodNight && Math.random() > 0.7) {
            naps.push({ time: '14:30', duration: 30, intentional: false });
        }

        const caffeine = [];
        const numCaffeine = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < numCaffeine; j++) {
            caffeine.push({ time: `${(8 + j * 4).toString().padStart(2,'0')}:00`, type: 'Kawa' });
        }

        const physicalActivity = [];
        if (Math.random() > 0.6) {
            physicalActivity.push({ time: '17:00', duration: 45, type: 'Spacer' });
        }

        const lightsOutMinute = (bedMinute + (Math.random() > 0.5 ? 0 : 15)) % 60;

        mockEntries.push({
            id: `mock_${Date.now()}_${i}`,
            date: dateStr,
            timeInBed: `${bedHour.toString().padStart(2, '0')}:${bedMinute.toString().padStart(2, '0')}`,
            lightsOut: `${bedHour.toString().padStart(2, '0')}:${lightsOutMinute.toString().padStart(2, '0')}`,
            sol,
            awakenings,
            finalWakeTime: `${wakeHour.toString().padStart(2, '0')}:${wakeMinute.toString().padStart(2, '0')}`,
            timeOutOfBed: `${wakeHour.toString().padStart(2, '0')}:${outOfBedMinute.toString().padStart(2, '0')}`,
            naps,
            caffeine,
            physicalActivity,
            screenTime: isGoodNight ? 30 : 90 + Math.floor(Math.random() * 60),
            alcohol: { used: Math.random() > 0.8, units: 1 },
            meds: '',
            relaxation: { used: isGoodNight, duration: isGoodNight ? 20 : 0 },
            sleepQuality: isGoodNight ? 4 : (Math.random() > 0.5 ? 2 : 3),
            energyLevel: isGoodNight ? 4 : (Math.random() > 0.5 ? 2 : 3),
            mood: isGoodNight ? 4 : 3,
            sleepiness: isGoodNight ? 3 : 6 + Math.floor(Math.random() * 3),
            notes: isGoodNight ? 'Bardzo dobrze spałem! Czuję się wypoczęty.' : 'Trudna noc, dużo myśli.'
        });
    }

    mockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    state.entries = mockEntries;
    saveData();
}

// ==========================================
// FORMULARZ WPISU DZIENNEGO
// ==========================================

function setupForm() {
    const form = document.getElementById('daily-entry-form');
    if (!form) return;

    // Domyślna data = dzisiaj
    document.getElementById('f-date').value = new Date().toISOString().split('T')[0];

    // Uzupełnij domyślne godziny z ostatniego wpisu
    if (state.entries.length > 0) {
        const last = state.entries[state.entries.length - 1];
        document.getElementById('f-tib-start').value = last.timeInBed || '23:00';
        document.getElementById('f-lights-out').value = last.lightsOut || '23:15';
        document.getElementById('f-wake').value = last.finalWakeTime || '06:00';
        document.getElementById('f-tib-end').value = last.timeOutOfBed || '06:15';
    } else {
        document.getElementById('f-tib-start').value = '23:00';
        document.getElementById('f-lights-out').value = '23:15';
        document.getElementById('f-wake').value = '06:00';
        document.getElementById('f-tib-end').value = '06:15';
    }

    document.getElementById('add-awakening-btn').addEventListener('click', addAwakeningField);
    document.getElementById('add-nap-btn').addEventListener('click', addNapField);
    document.getElementById('add-caffeine-btn').addEventListener('click', addCaffeineField);
    document.getElementById('add-activity-btn').addEventListener('click', addActivityField);
    document.getElementById('add-alcohol-btn').addEventListener('click', addAlcoholField);
    document.getElementById('add-meds-btn').addEventListener('click', addMedsField);

    document.getElementById('f-relaxation').addEventListener('change', (e) => {
        document.getElementById('f-relaxation-time').style.display = e.target.checked ? 'inline-block' : 'none';
        if (e.target.checked) document.getElementById('f-relaxation-time').value = 15;
    });

    form.addEventListener('submit', handleFormSubmit);

    document.getElementById('btn-cancel-form').addEventListener('click', () => {
        form.reset();
        document.getElementById('entry-id').value = '';
        ['awakenings-container', 'naps-container', 'caffeine-container', 'activity-container', 'alcohol-container', 'meds-container']
            .forEach(id => { document.getElementById(id).innerHTML = ''; });
        document.getElementById('f-date').value = new Date().toISOString().split('T')[0];
    });
}

function addAwakeningField() {
    const container = document.getElementById('awakenings-container');
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <input type="time" class="awk-time" title="Godzina przebudzenia">
        <input type="number" class="awk-duration" min="1" max="180" placeholder="Czas (min)" style="width: 100px;">
        <label style="margin: 0; font-size: 13px;"><input type="checkbox" class="awk-oob"> Wstałem/am</label>
        <input type="text" class="awk-activity" placeholder="Co robiłem/am? (opcja)" style="flex: 1; min-width: 130px;">
        <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

function addNapField() {
    const container = document.getElementById('naps-container');
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <input type="time" class="nap-time" title="Godzina drzemki">
        <input type="number" class="nap-duration" min="5" max="180" placeholder="Czas (min)" style="width: 100px;">
        <select class="nap-intentional">
            <option value="false">Niezamierzona</option>
            <option value="true">Zamierzona</option>
        </select>
        <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

function addCaffeineField() {
    const container = document.getElementById('caffeine-container');
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <input type="time" class="caf-time" title="Godzina">
        <select class="caf-type" style="width: 140px;">
            <option value="Kawa">Kawa</option>
            <option value="Herbata">Herbata</option>
            <option value="Energetyk">Energetyk</option>
            <option value="Cola">Cola</option>
            <option value="Inne">Inne</option>
        </select>
        <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

function addActivityField() {
    const container = document.getElementById('activity-container');
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <input type="time" class="act-time" title="Godzina rozpoczęcia">
        <input type="number" class="act-duration" min="5" max="300" placeholder="Czas (min)" style="width: 100px;">
        <select class="act-type" style="width: 140px;">
            <option value="Spacer">Spacer</option>
            <option value="Cardio">Cardio</option>
            <option value="Siłowy">Trening siłowy</option>
            <option value="Rozciąganie">Rozciąganie</option>
            <option value="Inna">Inna</option>
        </select>
        <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

function addAlcoholField() {
    const container = document.getElementById('alcohol-container');
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <input type="time" class="alc-time" title="Godzina">
        <input type="number" class="alc-units" min="1" max="20" placeholder="Ilość porcji" style="width: 100px;">
        <select class="alc-type" style="width: 140px;">
            <option value="Piwo">Piwo</option>
            <option value="Wino">Wino</option>
            <option value="Wódka">Wódka</option>
            <option value="Drink">Drink</option>
            <option value="Inny">Inny</option>
        </select>
        <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

function addMedsField() {
    const container = document.getElementById('meds-container');
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <input type="time" class="med-time" title="Godzina">
        <input type="text" class="med-name" placeholder="Nazwa leku/suplementu" style="flex: 1; min-width: 150px;">
        <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

function handleFormSubmit(e) {
    e.preventDefault();

    const entryId = document.getElementById('entry-id').value || Date.now().toString();
    const dateStr = document.getElementById('f-date').value;

    const awakenings = [];
    document.querySelectorAll('#awakenings-container .dynamic-item').forEach(div => {
        awakenings.push({
            time: div.querySelector('.awk-time').value,
            duration: parseInt(div.querySelector('.awk-duration').value) || 0,
            gotOutOfBed: div.querySelector('.awk-oob').checked,
            activity: div.querySelector('.awk-activity').value
        });
    });

    const naps = [];
    document.querySelectorAll('#naps-container .dynamic-item').forEach(div => {
        naps.push({
            time: div.querySelector('.nap-time').value,
            duration: parseInt(div.querySelector('.nap-duration').value) || 0,
            intentional: div.querySelector('.nap-intentional').value === 'true'
        });
    });

    const caffeine = [];
    document.querySelectorAll('#caffeine-container .dynamic-item').forEach(div => {
        caffeine.push({
            time: div.querySelector('.caf-time').value,
            type: div.querySelector('.caf-type').value
        });
    });

    const physicalActivity = [];
    document.querySelectorAll('#activity-container .dynamic-item').forEach(div => {
        physicalActivity.push({
            time: div.querySelector('.act-time').value,
            duration: parseInt(div.querySelector('.act-duration').value) || 0,
            type: div.querySelector('.act-type').value
        });
    });

    const alcohol = [];
    document.querySelectorAll('#alcohol-container .dynamic-item').forEach(div => {
        alcohol.push({
            time: div.querySelector('.alc-time').value,
            units: parseInt(div.querySelector('.alc-units').value) || 0,
            type: div.querySelector('.alc-type').value
        });
    });

    const meds = [];
    document.querySelectorAll('#meds-container .dynamic-item').forEach(div => {
        meds.push({
            time: div.querySelector('.med-time').value,
            name: div.querySelector('.med-name').value
        });
    });

    const newEntry = {
        id: entryId,
        date: dateStr,
        timeInBed: document.getElementById('f-tib-start').value,
        lightsOut: document.getElementById('f-lights-out').value,
        sol: parseInt(document.getElementById('f-sol').value) || 0,
        awakenings,
        finalWakeTime: document.getElementById('f-wake').value,
        timeOutOfBed: document.getElementById('f-tib-end').value,
        naps,
        caffeine,
        physicalActivity,
        alcohol,
        meds,
        screenTime: parseInt(document.getElementById('f-screen-time').value) || 0,
        relaxation: {
            used: document.getElementById('f-relaxation').checked,
            duration: parseInt(document.getElementById('f-relaxation-time').value) || 0
        },
        sleepQuality: parseInt(document.querySelector('input[name="quality"]:checked')?.value || 3),
        energyLevel: parseInt(document.querySelector('input[name="energy"]:checked')?.value || 3),
        mood: parseInt(document.querySelector('input[name="mood"]:checked')?.value || 3),
        sleepiness: parseInt(document.getElementById('f-sleepiness').value) || 0,
        notes: document.getElementById('f-notes').value
    };

    const existingIndex = state.entries.findIndex(e => e.id === entryId);
    if (existingIndex >= 0) {
        state.entries[existingIndex] = newEntry;
    } else {
        state.entries.push(newEntry);
    }

    state.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveData();
    alert('Wpis został zapisany!');
    document.getElementById('entry-id').value = '';

    renderTable();
    renderGrid();
}

// ==========================================
// WIDOK TABELARYCZNY
// ==========================================

function renderTable() {
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

        const emojiQ = ['😫','😟','😐','🙂','😴'][(entry.sleepQuality || 3) - 1] || '-';
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
    document.getElementById('f-tib-start').value = entry.timeInBed;
    document.getElementById('f-lights-out').value = entry.lightsOut;
    document.getElementById('f-sol').value = entry.sol;
    document.getElementById('f-wake').value = entry.finalWakeTime;
    document.getElementById('f-tib-end').value = entry.timeOutOfBed;

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
    if (entry.energyLevel) {
        const radio = document.querySelector(`input[name="energy"][value="${entry.energyLevel}"]`);
        if (radio) radio.checked = true;
    }
    if (entry.mood) {
        const radio = document.querySelector(`input[name="mood"][value="${entry.mood}"]`);
        if (radio) radio.checked = true;
    }

    document.getElementById('f-sleepiness').value = entry.sleepiness || 5;
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

// ==========================================
// WIDOK GRAFICZNY (SIATKA)
// ==========================================

function renderGrid() {
    const container = document.getElementById('sleep-grid');
    if (!container) return;
    container.innerHTML = '';

    if (state.entries.length === 0) {
        container.innerHTML = '<div style="padding:30px; text-align:center; color: var(--text-muted);">Brak danych do wyświetlenia siatki.</div>';
        return;
    }

    const startHour = state.settings.gridStartHour || 5;
    const TOTAL_MINUTES = 1440;

    // Nagłówek z godzinami
    const headerRow = document.createElement('div');
    headerRow.className = 'grid-header';

    const headerInfo = document.createElement('div');
    headerInfo.className = 'grid-col-info';
    headerInfo.style.fontWeight = '600';
    headerInfo.textContent = 'Data / SE%';
    headerRow.appendChild(headerInfo);

    const headerTimeline = document.createElement('div');
    headerTimeline.className = 'grid-timeline';
    headerTimeline.style.backgroundColor = 'transparent';

    for (let h = 0; h < 24; h++) {
        const currentHour = (startHour + h) % 24;
        const lbl = document.createElement('div');
        lbl.className = 'time-label';
        lbl.textContent = `${currentHour.toString().padStart(2, '0')}:00`;
        headerTimeline.appendChild(lbl);
    }
    headerRow.appendChild(headerTimeline);
    container.appendChild(headerRow);

    // Helper: offset % od lewej względem startHour
    function getLeftPct(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        let diff = h - startHour;
        if (diff < 0) diff += 24;
        const totalMin = diff * 60 + (m || 0);
        return (totalMin / TOTAL_MINUTES) * 100;
    }

    function getWidthPct(minutes) {
        return (Math.max(0, minutes) / TOTAL_MINUTES) * 100;
    }

    const reversed = [...state.entries].reverse();

    reversed.forEach(entry => {
        const m = calculateMetrics(entry);
        const row = document.createElement('div');
        row.className = 'grid-row';

        // Lewa kolumna informacyjna
        const infoCol = document.createElement('div');
        infoCol.className = 'grid-col-info';
        const emojiQ = ['😫','😟','😐','🙂','😴'][(entry.sleepQuality || 3) - 1] || '😐';
        infoCol.innerHTML = `
            <div class="date">${entry.date.slice(5)} ${emojiQ}</div>
            <div class="stats">SE: <span class="${getSeColorClass(m.se)}">${m.se}%</span></div>
        `;
        row.appendChild(infoCol);

        // Timeline
        const timeline = document.createElement('div');
        timeline.className = 'grid-timeline';

        // Tło: pionowe linie co godzinę
        for (let h = 0; h < 24; h++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            timeline.appendChild(slot);
        }

        // Blok TIB (błękitny — czas w łóżku)
        const tibBlock = document.createElement('div');
        tibBlock.className = 'sleep-block block-bed';
        tibBlock.style.left = `${getLeftPct(entry.timeInBed)}%`;
        tibBlock.style.width = `${getWidthPct(m.tib)}%`;
        tibBlock.title = `W łóżku: ${entry.timeInBed} → ${entry.timeOutOfBed}\nTIB: ${m.tibFormatted}`;
        timeline.appendChild(tibBlock);

        // Blok snu (granatowy)
        const sleepStartMin = timeToMinutes(entry.lightsOut) + m.sol;
        const sleepStartStr = minutesToTimeStr(sleepStartMin);
        const sleepDurationMin = getDurationInMinutes(sleepStartStr, entry.finalWakeTime);

        if (sleepDurationMin > 0) {
            const sleepBlock = document.createElement('div');
            sleepBlock.className = 'sleep-block block-sleep';
            sleepBlock.style.left = `${getLeftPct(sleepStartStr)}%`;
            sleepBlock.style.width = `${getWidthPct(sleepDurationMin)}%`;
            sleepBlock.title = `Zasnął: ${sleepStartStr}\nObudził: ${entry.finalWakeTime}\nTST: ${m.tstFormatted}`;
            timeline.appendChild(sleepBlock);

            // Przebudzenia (białe "dziury" w śnie)
            if (entry.awakenings && entry.awakenings.length > 0) {
                entry.awakenings.forEach(awk => {
                    if (!awk.time) return;
                    const hole = document.createElement('div');
                    hole.style.cssText = `
                        position: absolute;
                        background-color: var(--bg-main);
                        top: 2px; bottom: 2px;
                        left: ${getLeftPct(awk.time)}%;
                        width: ${getWidthPct(parseInt(awk.duration) || 0)}%;
                        z-index: 3;
                        border-radius: 2px;
                    `;
                    const outStr = awk.gotOutOfBed ? ' ↑ Wstał z łóżka' : '';
                    hole.title = `Przebudzenie ${awk.time} (${awk.duration} min)${outStr}`;
                    timeline.appendChild(hole);
                });
            }
        }

        // Drzemki (żółte)
        if (entry.naps && entry.naps.length > 0) {
            entry.naps.forEach(nap => {
                if (!nap.time) return;
                const napBlock = document.createElement('div');
                napBlock.className = 'sleep-block block-nap';
                napBlock.style.left = `${getLeftPct(nap.time)}%`;
                napBlock.style.width = `${getWidthPct(parseInt(nap.duration) || 0)}%`;
                napBlock.title = `Drzemka: ${nap.time} (${nap.duration} min) — ${nap.intentional ? 'Zamierzona' : 'Niezamierzona'}`;
                timeline.appendChild(napBlock);
            });
        }

        // Ikonki zdarzeń
        const addIcon = (time, emoji, label) => {
            if (!time) return;
            const icon = document.createElement('div');
            icon.className = 'event-icon';
            icon.textContent = emoji;
            icon.style.left = `${getLeftPct(time)}%`;
            icon.title = `${time} — ${label}`;
            timeline.appendChild(icon);
        };

        if (entry.caffeine) entry.caffeine.forEach(c => addIcon(c.time, '☕', `Kofeina: ${c.type}`));
        if (entry.physicalActivity) entry.physicalActivity.forEach(a => addIcon(a.time, '🏃', `Aktywność: ${a.type} (${a.duration} min)`));
        
        // Alkohol (obsługa starego i nowego formatu)
        if (Array.isArray(entry.alcohol)) {
            entry.alcohol.forEach(alc => addIcon(alc.time, '🍷', `Alkohol: ${alc.type}, ${alc.units} porc.`));
        } else if (entry.alcohol && entry.alcohol.used) {
            const alcTime = minutesToTimeStr(timeToMinutes(entry.timeInBed) - 60);
            addIcon(alcTime, '🍷', `Alkohol: ${entry.alcohol.units} porc.`);
        }

        // Leki (obsługa starego i nowego formatu)
        if (Array.isArray(entry.meds)) {
            entry.meds.forEach(med => addIcon(med.time, '💊', `Lek: ${med.name}`));
        } else if (typeof entry.meds === 'string' && entry.meds.trim() !== '') {
            const medsTime = minutesToTimeStr(timeToMinutes(entry.timeInBed) - 30);
            addIcon(medsTime, '💊', `Leki: ${entry.meds}`);
        }

        // Relaksacja
        if (entry.relaxation && entry.relaxation.used) {
            const relaxTime = minutesToTimeStr(timeToMinutes(entry.timeInBed) - (entry.relaxation.duration || 15));
            addIcon(relaxTime, '🧘', `Relaksacja: ${entry.relaxation.duration} min`);
        }

        // Czas ekranowy (pokazywany jako ikona 📱 przed snem)
        if (entry.screenTime > 0) {
            const screenTimeStart = minutesToTimeStr(timeToMinutes(entry.timeInBed) - entry.screenTime);
            addIcon(screenTimeStart, '📱', `Czas ekranowy: ${entry.screenTime} min przed snem`);
        }

        row.appendChild(timeline);
        container.appendChild(row);
    });
}

// ==========================================
// STATYSTYKI I WYKRESY
// ==========================================

const chartInstances = {};

function renderStats(days) {
    if (!days) days = 14;
    if (state.entries.length === 0) return;

    const sorted = [...state.entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const filtered = days === 'all' ? sorted : sorted.slice(-days);
    if (filtered.length === 0) return;

    const dates = [], seData = [], tstData = [], tibData = [], solData = [], wasoData = [];
    const energyData = [], qualityData = [], sleepinessData = [];
    let sumTst = 0, sumTib = 0, sumSol = 0, sumWaso = 0;

    filtered.forEach(entry => {
        const m = calculateMetrics(entry);
        sumTst += m.tst; sumTib += m.tib; sumSol += m.sol; sumWaso += m.waso;
        dates.push(entry.date.slice(5));
        seData.push(m.se);
        tstData.push(parseFloat((m.tst / 60).toFixed(2)));
        tibData.push(parseFloat((m.tib / 60).toFixed(2)));
        solData.push(m.sol);
        wasoData.push(m.waso);
        energyData.push(entry.energyLevel || 3);
        qualityData.push(entry.sleepQuality || 3);
        sleepinessData.push(entry.sleepiness || 5);
    });

    const count = filtered.length;
    const avgTst = sumTst / count;
    const avgTib = sumTib / count;
    const avgSe = avgTib > 0 ? (avgTst / avgTib) * 100 : 0;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setElClass = (id, val, cls) => { const el = document.getElementById(id); if (el) { el.textContent = val; el.className = `stat-value ${cls}`; } };

    setEl('stat-avg-tst', formatDuration(avgTst));
    setElClass('stat-avg-se', avgSe.toFixed(1) + '%', getSeColorClass(avgSe));
    setEl('stat-avg-sol', Math.round(sumSol / count) + ' min');
    setEl('stat-avg-waso', Math.round(sumWaso / count) + ' min');

    Chart.defaults.color = '#9e9e9e';
    Chart.defaults.font.family = "'Inter', sans-serif";

    const prep = (id) => {
        if (chartInstances[id]) chartInstances[id].destroy();
        const canvas = document.getElementById(id);
        if (!canvas) return null;
        return canvas.getContext('2d');
    };

    // 1. SE%
    const ctxSe = prep('chart-se');
    if (ctxSe) {
        chartInstances['chart-se'] = new Chart(ctxSe, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'SE %',
                    data: seData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                scales: {
                    y: {
                        min: 50, max: 100,
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: { legend: { labels: { color: '#9e9e9e' } } }
            }
        });
    }

    // 2. TST vs TIB
    const ctxTib = prep('chart-tst-tib');
    if (ctxTib) {
        chartInstances['chart-tst-tib'] = new Chart(ctxTib, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    { label: 'TIB (h)', data: tibData, borderColor: '#60a5fa', borderDash: [5,5], tension: 0.1, pointRadius: 3 },
                    { label: 'TST (h)', data: tstData, borderColor: '#1e3a8a', backgroundColor: 'rgba(30,58,138,0.2)', fill: true, tension: 0.1, pointRadius: 3 }
                ]
            },
            options: {
                scales: {
                    y: { min: 0, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 3. WASO & SOL
    const ctxWaso = prep('chart-waso-sol');
    if (ctxWaso) {
        chartInstances['chart-waso-sol'] = new Chart(ctxWaso, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    { label: 'SOL (min)', data: solData, backgroundColor: 'rgba(245,158,11,0.7)' },
                    { label: 'WASO (min)', data: wasoData, backgroundColor: 'rgba(239,68,68,0.7)' }
                ]
            },
            options: {
                scales: {
                    x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 4. Subiektywne
    const ctxSubj = prep('chart-subjective');
    if (ctxSubj) {
        chartInstances['chart-subjective'] = new Chart(ctxSubj, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    { label: 'Jakość snu (1-5)', data: qualityData, borderColor: '#8b5cf6', tension: 0.3, pointRadius: 3 },
                    { label: 'Energia (1-5)', data: energyData, borderColor: '#ec4899', tension: 0.3, pointRadius: 3 },
                    { label: 'Senność (0-10)', data: sleepinessData, borderColor: '#64748b', borderDash: [3,3], hidden: true }
                ]
            },
            options: {
                scales: {
                    y: { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}

// ==========================================
// KALKULATOR RESTRYKCJI SNU (SRT)
// ==========================================

window.calculateSRT = function() {
    if (state.entries.length === 0) {
        alert('Brak danych do analizy.');
        return;
    }

    const days = parseInt(document.getElementById('srt-days').value) || 14;
    const fixedWakeTime = document.getElementById('srt-wake').value || '06:00';
    const sorted = [...state.entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const filtered = sorted.slice(-days);
    if (filtered.length === 0) return;

    let sumTst = 0, sumTib = 0;
    filtered.forEach(entry => {
        const m = calculateMetrics(entry);
        sumTst += m.tst;
        sumTib += m.tib;
    });

    const avgTst = sumTst / filtered.length;
    const avgTib = sumTib / filtered.length;
    const avgSe = avgTib > 0 ? (avgTst / avgTib) * 100 : 0;

    const rounding = 15;
    let prescribedTib = Math.floor(avgTst / rounding) * rounding;

    const isElderly = (state.settings.patientAge || 30) >= 65;
    const minTib = isElderly ? 330 : 300;
    let note = '';

    if (prescribedTib < minTib) {
        prescribedTib = minTib;
        note = `Zastosowano minimum bezpieczeństwa (${formatDuration(minTib)}). `;
    }

    let recommendation = note;
    if (avgSe < 85) {
        recommendation += 'SE < 85% — zalecane <strong>skrócenie TIB o 15 min</strong> w kolejnym tygodniu (o ile powyżej minimum).';
    } else if (avgSe <= 90) {
        recommendation += 'SE 85–90% — <strong>bez zmian</strong>, kontynuuj obecne okno snu.';
    } else {
        const ext = (prescribedTib < 360 || avgSe > 95) ? 30 : 15;
        recommendation += `SE > 90% — zalecane <strong>wydłużenie TIB o ${ext} min</strong> dla lepszego wypoczynku.`;
    }

    const bedMin = timeToMinutes(fixedWakeTime) - prescribedTib;
    const prescribedBedTime = minutesToTimeStr(bedMin);

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
    setEl('srt-avg-tst', formatDuration(avgTst));
    setEl('srt-avg-se', avgSe.toFixed(1) + '%');
    setEl('srt-recommendation-text', recommendation);
    setEl('srt-prescribed-tib', formatDuration(prescribedTib));
    setEl('srt-sleep-window', `${prescribedBedTime} do ${fixedWakeTime}`);

    const resultsEl = document.getElementById('srt-results');
    if (resultsEl) resultsEl.style.display = 'block';
};

// ==========================================
// USTAWIENIA
// ==========================================

function loadSettingsForm() {
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
                    initApp();
                    alert('Dane zaimportowane pomyślnie.');
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

// ==========================================
// INICJALIZACJA APLIKACJI
// ==========================================

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
