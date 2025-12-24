// client/src/shared/ui/CommonHeader.tsx

import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/model/useAuth';
import { MobileNav } from './MobileNav';
import { ConfirmModal } from './ConfirmModal';
import { showConfirm } from '../utils';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = (): void => {
    showConfirm('정말 로그아웃 하시겠습니까?', () => {
      logout();
    });
  };

  const isInAdminPage = location.pathname.startsWith('/admin');

  // 모드 전환 버튼 렌더링 로직
  const renderModeSwitch = () => {
    // 슈퍼 관리자는 모드 전환 버튼 없음
    if (isSuperAdmin) return null;

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
    <>
      <header className="flex justify-between items-center bg-[#2c3e50] px-4 md:px-6 py-4 shadow-md text-white relative z-50">
        {/* 1. 왼쪽: 타이틀 및 메뉴 */}
        <div className="flex items-center gap-4 md:gap-8">
          <h1 className="text-lg md:text-xl font-bold text-green-400">{title}</h1>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex gap-6 text-sm">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors duration-200 ${
                  location.pathname === link.path
                    ? 'text-white font-bold border-b-2 border-green-400 pb-1'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 2. 오른쪽: 유저 정보 및 로그아웃 */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* 데스크톱 모드 전환 버튼 */}
          <div className="hidden md:block">{renderModeSwitch()}</div>

          {/* 유저 라벨 */}
          <span className="hidden sm:inline text-xs md:text-sm font-medium border border-gray-600 rounded px-2 py-1 bg-gray-700">
            {userLabel}
          </span>

          {/* 데스크톱 로그아웃 */}
          <button
            onClick={handleLogout}
            className="hidden md:block px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm transition duration-150"
          >
            로그아웃
          </button>

          {/* 햄버거 메뉴 버튼 (모바일) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 focus:outline-none"
            aria-label="메뉴"
          >
            <span
              className={`block w-6 h-0.5 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-white mt-1.5 transition-all duration-300 ${
                isMobileMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-white mt-1.5 transition-all duration-300 ${
                isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
              }`}
            />
          </button>
        </div>
      </header>

      {/* 모바일 사이드바 메뉴 */}
      {isMobileMenuOpen && (
        <>
          {/* 오버레이 배경 - 더 투명하게 */}
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* 사이드바 - 실제 서비스 스타일 */}
          <div className="fixed top-0 right-0 h-full w-56 bg-white shadow-2xl z-50 md:hidden transform transition-transform duration-300">
            {/* 헤더 */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <span className="text-gray-700 font-semibold text-sm">메뉴</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                ×
              </button>
            </div>

            {/* 메뉴 리스트 */}
            <nav className="flex flex-col p-3 space-y-1 h-[calc(100%-140px)] overflow-y-auto">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-lg transition-colors text-sm ${
                    location.pathname === link.path
                      ? 'bg-green-50 text-green-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* 구분선 */}
              {links.length > 0 && <div className="border-t border-gray-200 my-2" />}

              {/* 모드 전환 버튼 */}
              {!isSuperAdmin && isInAdminPage && (
                <button
                  onClick={() => {
                    navigate('/user-main');
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-lg text-sm text-green-700 hover:bg-green-50 font-medium transition text-left"
                >
                  사용자 모드로 이동
                </button>
              )}

              {!isSuperAdmin && !isInAdminPage && isAdmin && (
                <button
                  onClick={() => {
                    navigate(isSuperAdmin ? '/admin/super' : '/admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-lg text-sm text-blue-700 hover:bg-blue-50 font-medium transition text-left"
                >
                  관리자 모드로 이동
                </button>
              )}

              {/* 로그아웃 */}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="px-4 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium transition text-left"
              >
                로그아웃
              </button>
            </nav>

            {/* 하단 유저 정보 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">{userLabel}</div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
