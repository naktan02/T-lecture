
import { isKoreanHoliday } from '../src/common/utils/koreanHolidays';

function _calculateSchedules(
  start: string | Date | undefined,
  end: string | Date | undefined,
  excludedDateStrings: string[] = [],
): { date: Date }[] {
  if (!start || !end) return [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const excludedSet = new Set(excludedDateStrings);

  const schedules: { date: Date }[] = [];
  const current = new Date(startDate);

  console.log(`Calculating range: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getUTCDay(); // 0=Sun, 6=Sat

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = isKoreanHoliday(current);
    
    console.log(`Date: ${dateStr}, Day: ${dayOfWeek}, Weekend: ${isWeekend}, Holiday: ${isHoliday}`);

    if (!isWeekend && !isHoliday && !excludedSet.has(dateStr)) {
      schedules.push({
        date: new Date(`${dateStr}T00:00:00.000Z`),
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return schedules;
}

// 2026-05-01 (Labor Day? No, usually not public holiday but let's check Children's day 05-05)
// 2026-05-05 is Tuesday.
// 2026-05-02 (Sat), 05-03 (Sun).

console.log('--- Checking 2026-05-01 to 2026-05-07 ---');
// May 5th is Children's Day (Red day)
const schedules = _calculateSchedules('2026-05-01', '2026-05-07');

console.log('--- Result Schedules ---');
schedules.forEach(s => console.log(s.date.toISOString()));
