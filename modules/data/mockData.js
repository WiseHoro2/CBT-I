import { state, saveData } from '../state.js';

export function generateMockData() {
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

        const dateObj = new Date(dateStr);
        const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        mockEntries.push({
            id: `mock_${Date.now()}_${i}`,
            date: dateStr,
            isDayOff: isWeekend,
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
            energyLevel: isGoodNight ? 8 : 2 + Math.floor(Math.random() * 4),
            mood: isGoodNight ? 4 : 3,
            notes: isGoodNight ? 'Bardzo dobrze spałem! Czuję się wypoczęty.' : 'Trudna noc, dużo myśli.'
        });
    }

    mockEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    state.entries = mockEntries;
    saveData();
}
