// src/entities/user/ui/InstructorFields.tsx
import React, { ChangeEvent } from 'react';
import { SelectField } from '../../../shared/ui';
import { InstructorMetaResponse } from '../../../features/auth/authApi';

declare global {
  interface Window {
    daum: any;
  }
}

// InstructorMetaResponse를 InstructorOptions로 사용
type InstructorOptions = InstructorMetaResponse;

interface InstructorForm {
  address: string;
  teamId: string;
  category: string;
  virtueIds: number[];
  hasCar: boolean;
}

interface InstructorFieldsProps {
  form: InstructorForm;
  options: InstructorOptions;
  loadingOptions: boolean;
  onChange: (
    field: keyof InstructorForm,
  ) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onToggleVirtue: (virtueId: number) => void;
}

export const InstructorFields: React.FC<InstructorFieldsProps> = ({
  form,
  options,
  loadingOptions,
  onChange,
  onToggleVirtue,
}) => {
  // Daum Postcode 스크립트 로드
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleAddressSearch = () => {
    if (!window.daum || !window.daum.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: function (data: any) {
        const fullAddress = data.roadAddress || data.jibunAddress;

        // 가짜 이벤트 객체 생성하여 state 업데이트
        const fakeEvent = {
          target: { value: fullAddress, type: 'text' },
        } as ChangeEvent<HTMLInputElement>;

        onChange('address')(fakeEvent);
      },
    }).open();
  };

  return (
    <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="font-bold mb-4 text-sm text-gray-700">강사 활동 정보</h3>

      {loadingOptions ? (
        <p className="text-sm text-gray-500">강의 관련 옵션 불러오는 중...</p>
      ) : (
        <div className="space-y-4">
          {/* 거주지 주소 */}

          {/* 거주지 주소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              거주지 주소 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                placeholder="주소 검색을 클릭하여 주소를 입력하세요"
                value={form.address}
                onClick={handleAddressSearch}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={handleAddressSearch}
                className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 whitespace-nowrap"
              >
                주소 검색
              </button>
            </div>
          </div>

          {/* 팀 */}
          <SelectField
            label="소속 팀"
            required
            value={form.teamId}
            onChange={onChange('teamId') as (e: ChangeEvent<HTMLSelectElement>) => void}
            options={options.teams}
          />

          {/* 직책 */}
          <SelectField
            label="직책"
            required
            value={form.category}
            onChange={onChange('category') as (e: ChangeEvent<HTMLSelectElement>) => void}
            options={options.categories}
          />

          {/* 과목(덕목) 체크박스 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              강의 가능 과목(덕목) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
              {options.virtues.map((v) => {
                const checked = form.virtueIds.includes(v.id);
                return (
                  <label
                    key={v.id}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      checked={checked}
                      onChange={() => onToggleVirtue(v.id)}
                    />
                    <span>{v.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 자차 여부 */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="car"
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              checked={form.hasCar}
              onChange={onChange('hasCar') as (e: ChangeEvent<HTMLInputElement>) => void}
            />
            <label htmlFor="car" className="text-sm text-gray-700 cursor-pointer">
              자차 보유 및 운행 가능
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
