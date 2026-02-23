import { state } from '../state.js';
import { calculateMetrics, getSeColorClass } from '../utils/metrics.js';
import { formatDuration } from '../utils/time.js';

const chartInstances = {};

export function renderStats(days) {
    if (!days) days = 14;
    if (state.entries.length === 0) return;

    const sorted = [...state.entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const filtered = days === 'all' ? sorted : sorted.slice(-days);
    if (filtered.length === 0) return;

    const dates = [], seData = [], tstData = [], tibData = [], solData = [], wasoData = [];
    const energyData = [], qualityData = [];
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
        energyData.push(entry.energyLevel || 5);
        qualityData.push(entry.sleepQuality || 3);
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
                    { label: 'Energia (1-10)', data: energyData, borderColor: '#ec4899', tension: 0.3, pointRadius: 3 }
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
