// client/src/shared/ui/DateInput.tsx
import React, { ChangeEvent, useState, useEffect } from 'react';

interface DateInputProps {
  label?: string;
  name?: string;
  value: string; // YYYY-MM-DD 형식
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

/**
 * 커스텀 날짜 입력 컴포넌트
 * - 연도/월/일 모두 셀렉트 박스
 * - 연도: 2023~2030
 */
export const DateInput: React.FC<DateInputProps> = ({
  label,
  name,
  value,
  onChange,
  required = false,
}) => {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  // value가 변경되면 분리
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      }
    } else {
      setYear('');
      setMonth('');
      setDay('');
    }
  }, [value]);

  const handlePartChange = (part: 'year' | 'month' | 'day', val: string) => {
    let newYear = year;
    let newMonth = month;
    let newDay = day;

    if (part === 'year') {
      newYear = val;
      setYear(newYear);
    } else if (part === 'month') {
      newMonth = val;
      setMonth(newMonth);
    } else if (part === 'day') {
      newDay = val;
      setDay(newDay);
    }

    // 모든 값이 있으면 onChange 호출
    if (newYear && newMonth && newDay) {
      const newValue = `${newYear}-${newMonth}-${newDay}`;
      const syntheticEvent = {
        target: { name, value: newValue },
      } as ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  // 연도 옵션 생성 (2023~2030)
  const years = Array.from({ length: 8 }, (_, i) => ({
    value: String(2023 + i),
    label: `${2023 + i}년`,
  }));

  // 월 옵션 생성
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: `${i + 1}월`,
  }));

  // 일 옵션 생성 (해당 월의 일수 계산)
  const getDaysInMonth = (y: string, m: string) => {
    if (!y || !m) return 31;
    const yearNum = parseInt(y, 10) || 2024;
    const monthNum = parseInt(m, 10) || 1;
    return new Date(yearNum, monthNum, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: `${i + 1}일`,
  }));

  return (
    <div className="mb-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex gap-1 items-center">
        {/* 연도 선택 */}
        <select
          value={year}
          onChange={(e) => handlePartChange('year', e.target.value)}
          className="w-24 px-1 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">연도</option>
          {years.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>

        {/* 월 선택 */}
        <select
          value={month}
          onChange={(e) => handlePartChange('month', e.target.value)}
          className="w-20 px-1 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">월</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* 일 선택 */}
        <select
          value={day}
          onChange={(e) => handlePartChange('day', e.target.value)}
          className="w-20 px-1 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">일</option>
          {days.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
