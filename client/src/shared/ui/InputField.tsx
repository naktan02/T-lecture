//client/src/shared/ui/InputField.tsx
import React, { ChangeEvent } from 'react';

interface InputFieldProps {
  label?: string;
  type?: string;
  name?: string; // ✅ Added for form field identification
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  hasBtn?: string;
  onBtnClick?: () => void;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  hasBtn,
  onBtnClick,
}) => {
  return (
    <div className="mb-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
        />
        {hasBtn && (
          <button
            type="button"
            onClick={onBtnClick}
            className="shrink-0 px-2.5 sm:px-4 py-2 text-xs sm:text-sm text-green-600 border border-green-600 rounded-lg hover:bg-green-50 font-medium transition-colors whitespace-nowrap"
          >
            {hasBtn}
          </button>
        )}
      </div>
    </div>
  );
};
