import { state } from '../state.js';
import { calculateMetrics } from '../utils/metrics.js';
import { formatDuration, timeToMinutes, minutesToTimeStr } from '../utils/time.js';

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
