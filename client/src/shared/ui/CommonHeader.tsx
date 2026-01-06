// client/src/shared/ui/CommonHeader.tsx

import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/model/useAuth';
import { showConfirm } from '../utils';

// NavLink: 단일 링크 또는 드롭다운 그룹
export interface NavLink {
  label: string;
  path?: string; // 단일 링크용 (children이 있으면 무시됨)
  icon?: string;
  children?: NavLink[]; // 드롭다운 자식 메뉴
}

interface CommonHeaderProps {
  title: string;
  userLabel?: string;
  links?: NavLink[];
  logoPath?: string;
}

// 드롭다운 메뉴 컴포넌트
const DropdownMenu = ({ item, isActive }: { item: NavLink; isActive: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // 자식 중 하나라도 현재 경로에 해당하면 활성화 표시
  const isChildActive = item.children?.some((child) => location.pathname === child.path);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md transition-all duration-200 ${
          isActive || isChildActive
            ? 'text-white bg-white/10'
            : 'text-gray-300 hover:text-white hover:bg-white/5'
        }`}
      >
        {item.label}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 패널 - 다크 테마 */}
      <div
        className={`absolute top-full left-0 pt-2 z-50 transition-all duration-200 origin-top ${
          isOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
        }`}
      >
        <div className="bg-[#1a252f] rounded-lg shadow-2xl border border-gray-700/50 py-1.5 backdrop-blur-sm whitespace-nowrap">
          {/* 상단 삼각형 화살표 */}
          <div className="absolute -top-1.5 left-4 w-3 h-3 bg-[#1a252f] border-l border-t border-gray-700/50 transform rotate-45" />

          {item.children?.map((child) => (
            <Link
              key={child.path}
              to={child.path || '#'}
              className={`group flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 ${
                location.pathname === child.path
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {/* 활성화 인디케이터 */}
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
                  location.pathname === child.path
                    ? 'bg-green-400'
                    : 'bg-gray-600 group-hover:bg-gray-400'
                }`}
              />
              {child.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// 모바일 아코디언 메뉴 아이템
const MobileAccordionItem = ({ item, onClose }: { item: NavLink; onClose: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  // 단일 링크인 경우
  if (!item.children || item.children.length === 0) {
    return (
      <Link
        to={item.path || '#'}
        onClick={onClose}
        className={`px-4 py-2.5 rounded-lg transition-colors text-sm ${
          location.pathname === item.path
            ? 'bg-green-50 text-green-700 font-semibold'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        {item.label}
      </Link>
    );
  }

  // 드롭다운 그룹인 경우
  const isChildActive = item.children.some((child) => location.pathname === child.path);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex justify-between items-center px-4 py-2.5 rounded-lg text-sm transition-colors ${
          isChildActive ? 'text-green-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span>{item.label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
          {item.children.map((child) => (
            <Link
              key={child.path}
              to={child.path || '#'}
              onClick={onClose}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === child.path
                  ? 'bg-green-50 text-green-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * @param title - 왼쪽 상단 제목
 * @param userLabel - 오른쪽 유저 이름/직책 (선택적, 없으면 로그인된 사용자 이름 사용)
 * @param links - 네비게이션 메뉴 목록 [{ label: '메뉴명', path: '/이동경로', children: [...] }]
 */
export const CommonHeader = ({
  title,
  userLabel,
  links = [],
  logoPath = '#',
}: CommonHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAdmin, isSuperAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // userLabel이 없으면 localStorage에서 사용자 이름 가져오기
  const userName = localStorage.getItem('userName') || '사용자';
  const displayLabel = userLabel || userName;

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
          <Link to={logoPath} className="hover:opacity-80 transition-opacity">
            <h1 className="text-lg md:text-xl font-bold text-green-400">{title}</h1>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden md:flex gap-6 text-sm">
            {links.map((link) =>
              link.children && link.children.length > 0 ? (
                // 드롭다운 메뉴
                <DropdownMenu
                  key={link.label}
                  item={link}
                  isActive={location.pathname === link.path}
                />
              ) : (
                // 단일 링크 - 드롭다운 버튼과 같은 스타일
                <Link
                  key={link.path}
                  to={link.path || '#'}
                  className={`px-3 py-2 rounded-md transition-all duration-200 ${
                    location.pathname === link.path
                      ? 'text-white bg-white/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        {/* 2. 오른쪽: 유저 정보 및 로그아웃 */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* 데스크톱 모드 전환 버튼 */}
          <div className="hidden md:block">{renderModeSwitch()}</div>

          {/* 유저 라벨 */}
          <span className="hidden sm:inline text-xs md:text-sm font-medium border border-gray-600 rounded px-2 py-1 bg-gray-700">
            {displayLabel}
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
          {/* 오버레이 배경 */}
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* 사이드바 */}
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 md:hidden flex flex-col transform transition-transform duration-300">
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

            {/* 메뉴 리스트 - 아코디언 */}
            <nav className="flex flex-col p-3 space-y-1 flex-1 overflow-y-auto">
              {links.map((link) => (
                <MobileAccordionItem
                  key={link.label}
                  item={link}
                  onClose={() => setIsMobileMenuOpen(false)}
                />
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
              <div className="text-xs text-gray-500">{displayLabel}</div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
