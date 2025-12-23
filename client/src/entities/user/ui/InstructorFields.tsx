// src/entities/user/ui/InstructorFields.tsx
import React, { ChangeEvent } from 'react';
import { InputField, SelectField } from '../../../shared/ui';
import { InstructorMetaResponse } from '../../../features/auth/authApi';

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
  return (
    <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="font-bold mb-4 text-sm text-gray-700">강사 활동 정보</h3>

      {loadingOptions ? (
        <p className="text-sm text-gray-500">강의 관련 옵션 불러오는 중...</p>
      ) : (
        <div className="space-y-4">
          {/* 거주지 주소 */}
          <InputField
            label="거주지 주소"
            required
            placeholder="시/군/구까지 포함하여 입력하세요"
            value={form.address}
            onChange={onChange('address') as (e: ChangeEvent<HTMLInputElement>) => void}
          />

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
