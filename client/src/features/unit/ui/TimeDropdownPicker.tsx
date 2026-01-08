// client/src/features/unit/ui/TimeDropdownPicker.tsx
// 시간 선택기 컴포넌트 - 시/분 입력 + 드롭다운 방식

import { ChangeEvent, useState, useRef, useEffect } from 'react';

interface TimeDropdownPickerProps {
  value: string; // HH:mm 형식
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

// 시간 옵션 생성 (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

// 분 옵션 생성 (0, 10, 20, 30, 40, 50)
const MINUTES = ['00', '10', '20', '30', '40', '50'];

export const TimeDropdownPicker = ({
  value,
  onChange,
  disabled = false,
  className = '',
}: TimeDropdownPickerProps) => {
  // value가 HH:mm 형식일 때 파싱
  const [hour, minute] = (value || '').split(':');

  // 드롭다운 표시 상태
  const [showHourDropdown, setShowHourDropdown] = useState(false);
  const [showMinuteDropdown, setShowMinuteDropdown] = useState(false);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hourRef.current && !hourRef.current.contains(e.target as Node)) {
        setShowHourDropdown(false);
      }
      if (minuteRef.current && !minuteRef.current.contains(e.target as Node)) {
        setShowMinuteDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHourInput = (e: ChangeEvent<HTMLInputElement>) => {
    let newHour = e.target.value.replace(/\D/g, '');
    if (parseInt(newHour) > 23) newHour = '23';
    if (newHour.length > 2) newHour = newHour.slice(0, 2);
    const currentMinute = minute || '00';
    onChange(`${newHour.padStart(2, '0')}:${currentMinute}`);
  };

  const handleMinuteInput = (e: ChangeEvent<HTMLInputElement>) => {
    let newMinute = e.target.value.replace(/\D/g, '');
    if (parseInt(newMinute) > 59) newMinute = '59';
    if (newMinute.length > 2) newMinute = newMinute.slice(0, 2);
    const currentHour = hour || '00';
    onChange(`${currentHour}:${newMinute.padStart(2, '0')}`);
  };

  const selectHour = (h: string) => {
    const currentMinute = minute || '00';
    onChange(`${h}:${currentMinute}`);
    setShowHourDropdown(false);
  };

  const selectMinute = (m: string) => {
    const currentHour = hour || '00';
    onChange(`${currentHour}:${m}`);
    setShowMinuteDropdown(false);
  };

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {/* 시 입력 + 드롭다운 */}
      <div className="relative" ref={hourRef}>
        <div className="flex items-center">
          <input
            type="text"
            value={hour || ''}
            onChange={handleHourInput}
            onClick={() => !disabled && setShowHourDropdown(!showHourDropdown)}
            disabled={disabled}
            placeholder="00"
            maxLength={2}
            className="w-8 px-1 py-1 border border-gray-300 rounded-l text-sm text-center disabled:bg-gray-100"
          />
          <span className="px-1 py-1 bg-gray-100 border-y border-gray-300 text-xs text-gray-600">
            시
          </span>
        </div>
        {showHourDropdown && !disabled && (
          <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto w-12">
            {HOURS.map((h) => (
              <div
                key={h}
                onClick={() => selectHour(h)}
                className="px-2 py-1 text-sm hover:bg-blue-50 cursor-pointer text-center"
              >
                {h}
              </div>
            ))}
          </div>
        )}
      </div>

      <span className="text-gray-400 mx-0.5">:</span>

      {/* 분 입력 + 드롭다운 */}
      <div className="relative" ref={minuteRef}>
        <div className="flex items-center">
          <input
            type="text"
            value={minute || ''}
            onChange={handleMinuteInput}
            onClick={() => !disabled && setShowMinuteDropdown(!showMinuteDropdown)}
            disabled={disabled}
            placeholder="00"
            maxLength={2}
            className="w-8 px-1 py-1 border border-gray-300 rounded-l text-sm text-center disabled:bg-gray-100"
          />
          <span className="px-1 py-1 bg-gray-100 border-y border-r border-gray-300 rounded-r text-xs text-gray-600">
            분
          </span>
        </div>
        {showMinuteDropdown && !disabled && (
          <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto w-12">
            {MINUTES.map((m) => (
              <div
                key={m}
                onClick={() => selectMinute(m)}
                className="px-2 py-1 text-sm hover:bg-blue-50 cursor-pointer text-center"
              >
                {m}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
