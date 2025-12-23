// src/shared/ui/SelectField.tsx
import React, { ChangeEvent } from 'react';

interface SelectOption {
  id: string | number;
  name?: string | null;
  label?: string | null;
}

interface SelectFieldProps {
  label?: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options?: SelectOption[];
  placeholder?: string;
  required?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = '선택하세요',
  required = false,
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name || opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
