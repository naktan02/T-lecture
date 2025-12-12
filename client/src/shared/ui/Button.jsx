//client/src/shared/ui/Button.jsx
import React from 'react';

// 외부에서 className을 받아서 기존 스타일에 '덧붙여(Overriding)' 줍니다.
export const Button = ({ 
    children, 
    onClick, 
    type = "button", 
    variant = "primary", // 기본값: 초록색
    size = "medium",     // 기본값: 중간 크기
    fullWidth = false, 
    className = "",      // ⭐ 핵심: 외부에서 추가로 넣을 클래스
    disabled = false
    }) => {
    
    // 1. 기본 뼈대 (공통)
    const baseStyle = "rounded-lg font-bold transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

    // 2. 색상 테마 (Variant)
    const variants = {
        primary: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-300",
        secondary: "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-200",
        danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-300", // 삭제 버튼용
        outline: "border-2 border-green-600 text-green-600 hover:bg-green-50",
        ghost: "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100", // 단순 텍스트 버튼
    };

    // 3. 크기 옵션 (Size)
    const sizes = {
        xsmall: "px-2 py-1 text-[11px]",
        small: "px-3 py-1.5 text-sm",
        medium: "px-4 py-3 text-base",
        large: "px-6 py-4 text-lg",
    };

    // 4. 가로 꽉 채우기 옵션
    const widthStyle = fullWidth ? "w-full" : "";

    return (
        <button 
        type={type} 
        onClick={onClick} 
        disabled={disabled}
        // ⭐ 여기서 모든 스타일을 합칩니다 (외부 className이 가장 뒤에 와서 덮어씌움)
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
        >
        {children}
        </button>
    );
};