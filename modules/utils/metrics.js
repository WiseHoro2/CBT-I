import { getDurationInMinutes, formatDuration } from './time.js';

export function calculateMetrics(entry) {
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

export function getSeColorClass(se) {
    if (se >= 90) return 'text-success';
    if (se >= 85) return 'text-warning';
    return 'text-danger';
}
