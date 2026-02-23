import { state } from '../state.js';
import { calculateMetrics, getSeColorClass } from '../utils/metrics.js';
import { timeToMinutes, minutesToTimeStr, getDurationInMinutes } from '../utils/time.js';

export function renderGrid() {
    const container = document.getElementById('sleep-grid');
    if (!container) return;
    container.innerHTML = '';

    if (state.entries.length === 0) {
        container.innerHTML = '<div style="padding:30px; text-align:center; color: var(--text-muted);">Brak danych do wyświetlenia siatki.</div>';
        return;
    }

    const startHour = state.settings.gridStartHour || 16;
    const TOTAL_MINUTES = 1440;

    // Nagłówek z godzinami
    const headerRow = document.createElement('div');
    headerRow.className = 'grid-header';

    const headerInfo = document.createElement('div');
    headerInfo.className = 'grid-col-info';
    headerInfo.innerHTML = `
        <div class="grid-info-cell">Data</div>
        <div class="grid-info-cell">SE%</div>
        <div class="grid-info-cell">Subj.</div>
    `;
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
        
        const dateObj = new Date(entry.date);
        const days = ['Ndz', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'];
        const dayStr = days[dateObj.getDay()];
        
        const emojiQ = ['😫','😟','😐','🙂','😄'][(entry.sleepQuality || 3) - 1] || '😐';
        const energyStr = entry.energyLevel ? `⚡${entry.energyLevel}` : '';
        const dayOffStr = entry.isDayOff ? '<span title="Dzień wolny od pracy">🏖️</span>' : '';

        infoCol.innerHTML = `
            <div class="grid-info-cell date-cell">
                <span>${entry.date.slice(5)} ${dayStr}</span>
                ${dayOffStr}
            </div>
            <div class="grid-info-cell se-cell ${getSeColorClass(m.se)}">
                ${m.se}%
            </div>
            <div class="grid-info-cell subj-cell">
                <span title="Jakość snu">${emojiQ}</span>
                ${energyStr ? `<span title="Poziom energii">${energyStr}</span>` : ''}
            </div>
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

            // Przebudzenia (białe "dziury" w śnie) -> teraz kolor zależny od tego, czy wstał
            if (entry.awakenings && entry.awakenings.length > 0) {
                entry.awakenings.forEach(awk => {
                    if (!awk.time) return;
                    const hole = document.createElement('div');
                    
                    // Kolor zależy od tego czy wstał: czarno-zielony (wstał), czarno-pomarańczowy (został)
                    const wasoColor = awk.gotOutOfBed ? '#133320' : '#3d1c14';
                    
                    hole.style.cssText = `
                        position: absolute;
                        background-color: ${wasoColor};
                        border: 1px solid ${awk.gotOutOfBed ? '#1e4d30' : '#5c2c20'};
                        top: 2px; bottom: 2px;
                        left: ${getLeftPct(awk.time)}%;
                        width: ${getWidthPct(parseInt(awk.duration) || 0)}%;
                        z-index: 3;
                        border-radius: 2px;
                    `;
                    const outStr = awk.gotOutOfBed ? ' ↑ Wstał z łóżka' : ' ↑ Pozostał w łóżku';
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

        // Zgaszenie światła (Lights out)
        if (entry.lightsOut) {
            addIcon(entry.lightsOut, '💡', 'Zgaszenie światła (próba zaśnięcia)');
            
            // Opcjonalnie: można też dodać cienką pionową kreskę oddzielającą czytanie od prób zaśnięcia
            const lightsOutLine = document.createElement('div');
            lightsOutLine.style.cssText = `
                position: absolute;
                border-left: 2px dashed rgba(255, 255, 255, 0.4);
                top: -5px; bottom: -5px;
                left: ${getLeftPct(entry.lightsOut)}%;
                z-index: 4;
            `;
            timeline.appendChild(lightsOutLine);
        }

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
