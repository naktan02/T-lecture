import React, { ChangeEvent } from 'react';
import { AddressSearchInput, SelectField } from '../../../shared/ui';
import { InstructorMetaResponse } from '../../../features/auth/authApi';

type InstructorOptions = InstructorMetaResponse;

interface InstructorForm {
  address: string;
  addressDetail: string;
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
  const handleAddressChange = (value: string) => {
    onChange('address')({
      target: { value, type: 'text' },
    } as ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
      <h3 className="mb-4 text-sm font-bold text-gray-700">강사 활동 정보</h3>

      {loadingOptions ? (
        <p className="text-sm text-gray-500">강의 관련 옵션 불러오는 중...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              거주지 주소 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2">
              <AddressSearchInput value={form.address} onChange={handleAddressChange} />
              <input
                type="text"
                placeholder="상세주소 (예: 101동 101호)"
                value={form.addressDetail}
                onChange={onChange('addressDetail') as (e: ChangeEvent<HTMLInputElement>) => void}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <SelectField
            label="소속 팀"
            placeholder="무소속"
            value={form.teamId}
            onChange={onChange('teamId') as (e: ChangeEvent<HTMLSelectElement>) => void}
            options={options.teams}
          />

          <SelectField
            label="직책"
            required
            value={form.category}
            onChange={onChange('category') as (e: ChangeEvent<HTMLSelectElement>) => void}
            options={options.categories}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              강의 가능 과목(덕목) <span className="text-red-500">*</span>
            </label>
            <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-gray-300 bg-white p-3">
              {options.virtues.map((virtue) => {
                const checked = form.virtueIds.includes(virtue.id);

                return (
                  <label
                    key={virtue.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded text-green-600 focus:ring-green-500"
                      checked={checked}
                      onChange={() => onToggleVirtue(virtue.id)}
                    />
                    <span>{virtue.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="car"
              className="h-4 w-4 rounded text-green-600 focus:ring-green-500"
              checked={form.hasCar}
              onChange={onChange('hasCar') as (e: ChangeEvent<HTMLInputElement>) => void}
            />
            <label htmlFor="car" className="cursor-pointer text-sm text-gray-700">
              자차 보유 및 운행 가능
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
