// client/src/shared/ui/MobileNav.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavLink {
  label: string;
  path: string;
  icon?: string;
}

interface MobileNavProps {
  links: NavLink[];
  onLogout: () => void;
  userLabel: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ links, onLogout, userLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // 메뉴 열릴 때 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        aria-label="메뉴 열기"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 사이드 메뉴 */}
      <div
        className={`
          fixed top-0 left-0 h-full w-72 bg-[#2c3e50] z-50 
          transform transition-transform duration-300 ease-in-out md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* 헤더 */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-green-400 font-bold text-lg">T-Lecture</span>
            <button onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="mt-3 px-2 py-2 bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-300">로그인 계정</p>
            <p className="text-white font-medium">{userLabel}</p>
          </div>
        </div>

        {/* 메뉴 링크 */}
        <nav className="p-4 space-y-1">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive
                      ? 'bg-green-500/20 text-green-400 font-medium'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                {link.icon && <span className="text-lg">{link.icon}</span>}
                <span>{link.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 bg-green-400 rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {/* 하단 로그아웃 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 
                       bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 
                       transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            로그아웃
          </button>
        </div>
      </div>
    </>
  );
};
