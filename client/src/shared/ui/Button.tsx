//client/src/shared/ui/Button.tsx
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
}

// 외부에서 className을 받아서 기존 스타일에 '덧붙여(Overriding)' 줍니다.
export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  className = '',
  disabled = false,
}) => {
  // 1. 기본 뼈대 (공통)
  const baseStyle =
    'rounded-lg font-bold transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // 2. 색상 테마 (Variant)
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-200',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300',
    outline: 'border-2 border-green-600 text-green-600 hover:bg-green-50',
    ghost: 'bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100',
  };

  // 3. 크기 옵션 (Size) - 반응형: 모바일에서 더 작게
  const sizes: Record<ButtonSize, string> = {
    xsmall: 'px-1.5 py-0.5 text-[10px] md:px-2 md:py-1 md:text-[11px]',
    small: 'px-2 py-1 text-xs md:px-3 md:py-1.5 md:text-sm',
    medium: 'px-3 py-2 text-sm md:px-4 md:py-3 md:text-base',
    large: 'px-4 py-3 text-base md:px-6 md:py-4 md:text-lg',
  };

  // 4. 가로 꽉 채우기 옵션
  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
    >
      {children}
    </button>
  );
};
