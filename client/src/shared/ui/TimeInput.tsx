// client/src/shared/ui/TimeInput.tsx
import React, { ChangeEvent, useState, useEffect, useRef } from 'react';

interface TimeInputProps {
  label?: string;
  name?: string;
  value: string; // HH:MM 형식
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  step?: number; // 분 단위 (기본 30)
}

/**
 * 24시간 형식 시간 입력 컴포넌트
 * - 키보드 직접 입력 가능 (HH:MM, : 자동 삽입)
 * - 드롭다운 선택 가능 (30분 단위)
 */
export const TimeInput: React.FC<TimeInputProps> = ({
  label,
  name,
  value,
  onChange,
  required = false,
  step = 30,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 시간 옵션 생성 (step 분 단위)
  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      const hour = String(h).padStart(2, '0');
      const min = String(m).padStart(2, '0');
      timeOptions.push(`${hour}:${min}`);
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // 숫자와 콜론만 허용
    val = val.replace(/[^\d:]/g, '');

    // 숫자만 추출
    const digits = val.replace(/:/g, '');

    // 최대 4자리
    const limited = digits.slice(0, 4);

    // 자동 콜론 삽입: 2자리 이상이면 HH:MM 형식으로
    let formatted = limited;
    if (limited.length > 2) {
      formatted = `${limited.slice(0, 2)}:${limited.slice(2)}`;
    }

    setInputValue(formatted);

    // HH:MM 형식이 완성되면 onChange 호출
    if (/^\d{2}:\d{2}$/.test(formatted)) {
      const [h, m] = formatted.split(':').map(Number);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        const syntheticEvent = {
          target: { name, value: formatted },
        } as ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    }
  };

  const handleBlur = () => {
    // 입력값 정규화 시도
    let normalized = inputValue.replace(/[^\d:]/g, '');
    const digits = normalized.replace(/:/g, '');

    // 4자리면 HH:MM으로 변환
    if (digits.length === 4) {
      normalized = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
    // 3자리면 H:MM으로 가정
    else if (digits.length === 3) {
      normalized = `0${digits.slice(0, 1)}:${digits.slice(1)}`;
    }

    if (/^\d{2}:\d{2}$/.test(normalized)) {
      const [h, m] = normalized.split(':').map(Number);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        setInputValue(normalized);
        const syntheticEvent = {
          target: { name, value: normalized },
        } as ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
        return;
      }
    }

    // 유효하지 않으면 원래 value로 복원
    setInputValue(value || '');
  };

  const handleSelect = (time: string) => {
    setInputValue(time);
    setShowDropdown(false);
    const syntheticEvent = {
      target: { name, value: time },
    } as ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="mb-2" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onBlur={handleBlur}
          placeholder="HH:MM"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-8"
        />
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {timeOptions.map((time) => (
              <button
                key={time}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(time)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-green-50 ${
                  time === inputValue ? 'bg-green-100 text-green-700' : ''
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
