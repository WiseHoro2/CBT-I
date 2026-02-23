export function timeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
}

export function minutesToTimeStr(minutes) {
    const total = ((minutes % 1440) + 1440) % 1440; // zawijaj przez 24h
    const h = Math.floor(total / 60);
    const m = Math.floor(total % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatDuration(minutes) {
    const abs = Math.abs(Math.round(minutes));
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

/**
 * Różnica między startTime a endTime w minutach (uwzględnia przejście przez północ).
 */
export function getDurationInMinutes(startTimeStr, endTimeStr) {
    const start = timeToMinutes(startTimeStr);
    const end = timeToMinutes(endTimeStr);
    if (end < start) {
        return (1440 - start) + end;
    }
    return end - start;
}
