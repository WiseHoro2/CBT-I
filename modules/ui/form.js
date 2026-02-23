import { state, saveData } from '../state.js';
import { renderTable } from './table.js';
import { renderGrid } from './grid.js';
import { getDurationInMinutes } from '../utils/time.js';

export function setupForm() {
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

    const fSol = document.getElementById('f-sol');
    const fEnergy = document.getElementById('f-energy');
    
    if (fSol) {
        fSol.addEventListener('input', (e) => {
            const solVal = document.getElementById('sol-val');
            if (solVal) solVal.textContent = e.target.value;
        });
    }
    if (fEnergy) {
        fEnergy.addEventListener('input', (e) => {
            const energyVal = document.getElementById('energy-val');
            if (energyVal) energyVal.textContent = e.target.value;
        });
    }

    const btnOpenTutorial = document.getElementById('open-tutorial');
    const btnCloseTutorial = document.getElementById('close-tutorial');
    const modalTutorial = document.getElementById('tutorial-modal');

    if (btnOpenTutorial && modalTutorial) {
        btnOpenTutorial.addEventListener('click', (e) => {
            e.preventDefault();
            modalTutorial.showModal();
        });
    }
    if (btnCloseTutorial && modalTutorial) {
        btnCloseTutorial.addEventListener('click', () => {
            modalTutorial.close();
        });
    }

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
        
        // Resetowanie spanów dla suwaków po zresetowaniu formularza
        setTimeout(() => {
            if (fSol) document.getElementById('sol-val').textContent = fSol.value;
            if (fEnergy) document.getElementById('energy-val').textContent = fEnergy.value;
        }, 10);
    });
}

export function addAwakeningField() {
    const container = document.getElementById('awakenings-container');
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.innerHTML = `
        <input type="time" class="awk-time" title="Godzina przebudzenia">
        <input type="number" class="awk-duration" list="awk-duration-presets" min="1" max="180" placeholder="Czas (min)" style="width: 100px;">
        <label style="margin: 0; font-size: 13px;"><input type="checkbox" class="awk-oob"> Wstałem/am</label>
        <input type="text" class="awk-activity" placeholder="Co robiłem/am? (opcja)" style="flex: 1; min-width: 130px;">
        <button type="button" class="btn-danger-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
}

export function addNapField() {
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

export function addCaffeineField() {
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

export function addActivityField() {
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

export function addAlcoholField() {
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

export function addMedsField() {
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
    const tibStart = document.getElementById('f-tib-start').value;
    const lightsOut = document.getElementById('f-lights-out').value;
    const wake = document.getElementById('f-wake').value;
    const tibEnd = document.getElementById('f-tib-end').value;

    // Walidacja czasów logicznych z uwzględnieniem przejścia przez północ
    const loOffset = getDurationInMinutes(tibStart, lightsOut);
    const wakeOffset = getDurationInMinutes(tibStart, wake);
    const endOffset = getDurationInMinutes(tibStart, tibEnd);

    if (loOffset > 1080) { // ponad 18 godzin
        alert("Błąd: Zgaszenie światła nie może wystąpić przed położeniem się do łóżka (lub wpisano niepoprawną dobę).");
        return;
    }
    if (wakeOffset < loOffset) {
        alert("Błąd: Ostateczne obudzenie musi nastąpić po zgaszeniu światła.");
        return;
    }
    if (endOffset < wakeOffset) {
        alert("Błąd: Wstanie z łóżka musi nastąpić po ostatecznym obudzeniu.");
        return;
    }
    if (endOffset > 1440) {
        alert("Błąd: Łączny czas spędzony w łóżku przekracza 24 godziny. Sprawdź wpisane wartości.");
        return;
    }

    const awakenings = [];
    let hasAwakeningError = false;
    document.querySelectorAll('#awakenings-container .dynamic-item').forEach(div => {
        const awkTime = div.querySelector('.awk-time').value;
        const awkDuration = parseInt(div.querySelector('.awk-duration').value) || 0;
        
        if (awkTime) {
            const awkOffset = getDurationInMinutes(tibStart, awkTime);
            if (awkOffset < loOffset || awkOffset > wakeOffset) {
                alert(`Błąd: Przebudzenie o ${awkTime} występuje poza okresem snu (pomiędzy zgaszeniem światła a ostatecznym obudzeniem).`);
                hasAwakeningError = true;
            }
        }

        awakenings.push({
            time: awkTime,
            duration: awkDuration,
            gotOutOfBed: div.querySelector('.awk-oob').checked,
            activity: div.querySelector('.awk-activity').value
        });
    });

    if (hasAwakeningError) return;

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
        isDayOff: document.getElementById('f-day-off').value === 'true',
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
        energyLevel: parseInt(document.getElementById('f-energy').value) || 5,
        mood: parseInt(document.querySelector('input[name="mood"]:checked')?.value || 3),
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
