// client/src/shared/ui/CommonHeader.tsx

import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/model/useAuth';
import { MobileNav } from './MobileNav';

interface NavLink {
  label: string;
  path: string;
  icon?: string;
}

interface CommonHeaderProps {
  title: string;
  userLabel: string;
  links?: NavLink[];
}

/**
 * @param title - 왼쪽 상단 제목
 * @param userLabel - 오른쪽 유저 이름/직책
 * @param links - 네비게이션 메뉴 목록 [{ label: '메뉴명', path: '/이동경로' }]
 */
export const CommonHeader: React.FC<CommonHeaderProps> = ({ title, userLabel, links = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAdmin, isSuperAdmin } = useAuth();

  const handleLogout = async (): Promise<void> => {
    if (window.confirm('정말 로그아웃 하시겠습니까?')) {
      logout();
    }
  };

  const isInAdminPage = location.pathname.startsWith('/admin');

  // 모드 전환 버튼 렌더링 로직
  const renderModeSwitch = () => {
    // 1. 관리자 페이지에 있을 때 -> '사용자 모드로 이동'
    if (isInAdminPage) {
      return (
        <button
          onClick={() => navigate('/user-main')}
          className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm 
                     transition-all duration-200 active:scale-95 hidden sm:block"
        >
          사용자 모드
        </button>
      );
    }

    // 2. 일반 페이지에 있는데 관리자 권한이 있을 때 -> '관리자 모드로 이동'
    if (isAdmin) {
      return (
        <button
          onClick={() => navigate(isSuperAdmin ? '/admin/super' : '/admin')}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm 
                     transition-all duration-200 active:scale-95 hidden sm:block"
        >
          관리자 모드
        </button>
      );
    }
    return null;
  };

  return (
    <header className="sticky top-0 z-30 flex justify-between items-center bg-[#2c3e50] px-4 md:px-6 py-3 md:py-4 shadow-lg text-white">
      {/* 1. 왼쪽: 모바일 메뉴 + 타이틀 */}
      <div className="flex items-center gap-4">
        {/* 모바일 네비게이션 */}
        <MobileNav links={links} onLogout={handleLogout} userLabel={userLabel} />

        {/* 로고/타이틀 */}
        <h1 className="text-lg md:text-xl font-bold text-green-400">{title}</h1>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                {link.icon && <span className="mr-2">{link.icon}</span>}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 2. 오른쪽: 유저 정보 및 로그아웃 */}
      <div className="flex items-center gap-2 md:gap-4">
        {renderModeSwitch()}

        {/* 유저 라벨 - 모바일에서 축소 */}
        <span className="hidden sm:block text-sm font-medium border border-gray-600 rounded-lg px-3 py-2 bg-gray-700/50">
          {userLabel}
        </span>

        {/* 로그아웃 버튼 - 데스크톱만 */}
        <button
          onClick={handleLogout}
          className="hidden md:flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 
                     rounded-lg text-sm transition-all duration-200 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </header>
  );
};
