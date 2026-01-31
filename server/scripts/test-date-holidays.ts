
import Holidays from 'date-holidays';

const hd = new Holidays('KR');

console.log('--- Checking 2026 Holidays ---');
const holidays2026 = hd.getHolidays(2026);
holidays2026.forEach(h => {
    console.log(`${h.date} - ${h.name} (${h.type})`);
});

// Check specific date: 2026-05-05 (Children's Day)
const checkDate = new Date('2026-05-05');
console.log(`Is 2026-05-05 holiday?`, hd.isHoliday(checkDate));
