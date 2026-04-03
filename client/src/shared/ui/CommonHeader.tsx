import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/model/useAuth';
import { showConfirm } from '../utils';

export interface NavLink {
  label: string;
  path?: string;
  icon?: string;
  badgeCount?: number;
  children?: NavLink[];
}

interface CommonHeaderProps {
  title: string;
  userLabel?: string;
  links?: NavLink[];
  logoPath?: string;
  onRefresh?: () => void;
}

// Hide the badge when the count is zero or missing.
const formatBadgeCount = (count?: number) => {
  if (!count || count <= 0) {
    return null;
  }

  return count > 99 ? '99+' : String(count);
};

const HeaderBadge = ({ count }: { count?: number }) => {
  const label = formatBadgeCount(count);

  if (!label) {
    return null;
  }

  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
      {label}
    </span>
  );
};

const PositionedHeaderBadge = ({ count }: { count?: number }) => {
  const label = formatBadgeCount(count);

  if (!label) {
    return null;
  }

  return (
    <span className="absolute -top-2 -right-3 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white shadow-sm">
      {label}
    </span>
  );
};

const DesktopNavLabel = ({ label, count }: { label: string; count?: number }) => (
  <span className={`relative inline-flex ${count && count > 0 ? 'pr-3' : ''}`}>
    <span>{label}</span>
    <PositionedHeaderBadge count={count} />
  </span>
);

const DropdownMenu = ({ item, isActive }: { item: NavLink; isActive: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isChildActive = item.children?.some((child) => location.pathname === child.path);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs whitespace-nowrap transition-all duration-200 lg:px-3 lg:py-2 lg:text-sm ${
          isActive || isChildActive
            ? 'bg-white/10 text-white'
            : 'text-gray-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        <DesktopNavLabel label={item.label} count={item.badgeCount} />
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`absolute top-full left-0 z-50 origin-top pt-2 transition-all duration-200 ${
          isOpen ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
        }`}
      >
        <div className="whitespace-nowrap rounded-lg border border-gray-700/50 bg-[#1a252f] py-1.5 shadow-2xl backdrop-blur-sm">
          <div className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 border-t border-l border-gray-700/50 bg-[#1a252f]" />

          {item.children?.map((child) => (
            <Link
              key={child.path || child.label}
              to={child.path || '#'}
              className={`group flex items-center justify-between gap-4 px-4 py-2.5 text-sm transition-all duration-150 ${
                location.pathname === child.path
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-150 ${
                    location.pathname === child.path
                      ? 'bg-green-400'
                      : 'bg-gray-600 group-hover:bg-gray-400'
                  }`}
                />
                <span>{child.label}</span>
              </span>
              <HeaderBadge count={child.badgeCount} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const MobileAccordionItem = ({ item, onClose }: { item: NavLink; onClose: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  if (!item.children || item.children.length === 0) {
    return (
      <Link
        to={item.path || '#'}
        onClick={onClose}
        className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm transition-colors ${
          location.pathname === item.path
            ? 'bg-green-50 font-semibold text-green-700'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span>{item.label}</span>
        <HeaderBadge count={item.badgeCount} />
      </Link>
    );
  }

  const isChildActive = item.children.some((child) => location.pathname === child.path);

  return (
    <div>
      <button
        onClick={() => setIsExpanded((current) => !current)}
        className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm transition-colors ${
          isChildActive ? 'font-semibold text-green-700' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-2">
          <span>{item.label}</span>
          <HeaderBadge count={item.badgeCount} />
        </span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-3">
          {item.children.map((child) => (
            <Link
              key={child.path || child.label}
              to={child.path || '#'}
              onClick={onClose}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                location.pathname === child.path
                  ? 'bg-green-50 font-medium text-green-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{child.label}</span>
              <HeaderBadge count={child.badgeCount} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export const CommonHeader = ({
  title,
  userLabel,
  links = [],
  logoPath = '#',
  onRefresh,
}: CommonHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAdmin, isSuperAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (isMobileMenuOpen) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY <= 0) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (Math.abs(currentScrollY - lastScrollY.current) < 10) {
        return;
      }

      setIsVisible(currentScrollY < lastScrollY.current);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobileMenuOpen]);

  const userName = localStorage.getItem('userName') || '사용자';
  const displayLabel = userLabel || userName;
  const isInAdminPage = location.pathname.startsWith('/admin');

  const handleLogout = async (): Promise<void> => {
    const confirmed = await showConfirm('정말 로그아웃 하시겠습니까?');
    if (confirmed) {
      logout();
    }
  };

  const renderModeSwitch = () => {
    if (isSuperAdmin) {
      return null;
    }

    if (isInAdminPage) {
      return (
        <button
          onClick={() => navigate('/user-main')}
          className="hidden whitespace-nowrap rounded-lg bg-green-600 px-2 py-1.5 text-xs transition-all duration-200 active:scale-95 hover:bg-green-700 sm:block lg:px-3 lg:py-2 lg:text-sm"
        >
          사용자 모드
        </button>
      );
    }

    if (isAdmin) {
      return (
        <button
          onClick={() => navigate(isSuperAdmin ? '/admin/super' : '/admin')}
          className="hidden whitespace-nowrap rounded-lg bg-blue-600 px-2 py-1.5 text-xs transition-all duration-200 active:scale-95 hover:bg-blue-700 sm:block lg:px-3 lg:py-2 lg:text-sm"
        >
          관리자 모드
        </button>
      );
    }

    return null;
  };

  return (
    <div className="h-[var(--header-height)]">
      <header
        className={`fixed top-0 left-0 z-50 flex w-full items-center justify-between bg-[#2c3e50] px-4 py-4 text-white shadow-md transition-transform duration-300 ease-in-out md:px-6 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-4 md:gap-8">
          <Link to={logoPath} className="transition-opacity hover:opacity-80">
            <h1 className="whitespace-nowrap text-sm font-bold text-green-400 lg:text-lg xl:text-xl">
              {title}
            </h1>
          </Link>

          <nav className="hidden gap-1 text-xs md:flex lg:gap-3 lg:text-sm xl:gap-6">
            {links.map((link) =>
              link.children && link.children.length > 0 ? (
                <DropdownMenu
                  key={link.label}
                  item={link}
                  isActive={location.pathname === link.path}
                />
              ) : (
                <Link
                  key={link.path || link.label}
                  to={link.path || '#'}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 whitespace-nowrap transition-all duration-200 lg:px-3 lg:py-2 ${
                    location.pathname === link.path
                      ? 'bg-white/10 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <DesktopNavLabel label={link.label} count={link.badgeCount} />
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="rounded-md p-2 text-gray-300 transition-all duration-200 active:scale-95 hover:bg-white/10 hover:text-white"
              title="새로고침"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          <div className="hidden md:block">{renderModeSwitch()}</div>

          <span className="hidden whitespace-nowrap rounded border border-gray-600 bg-gray-700 px-1.5 py-0.5 text-xs font-medium sm:inline lg:px-2 lg:py-1 lg:text-sm">
            {displayLabel}
          </span>

          <button
            onClick={handleLogout}
            className="hidden whitespace-nowrap rounded-md bg-red-600 px-2 py-1 text-xs transition duration-150 hover:bg-red-700 md:block lg:px-3 lg:text-sm"
          >
            로그아웃
          </button>

          <button
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            className="flex h-8 w-8 flex-col items-center justify-center focus:outline-none md:hidden"
            aria-label="메뉴"
          >
            <span
              className={`block h-0.5 w-6 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? 'translate-y-1.5 rotate-45' : ''
              }`}
            />
            <span
              className={`mt-1.5 block h-0.5 w-6 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`mt-1.5 block h-0.5 w-6 bg-white transition-all duration-300 ${
                isMobileMenuOpen ? '-translate-y-1.5 -rotate-45' : ''
              }`}
            />
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="fixed top-0 right-0 z-50 flex h-full w-64 flex-col bg-white shadow-2xl transition-transform duration-300 md:hidden">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
              <span className="text-sm font-semibold text-gray-700">메뉴</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-2xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <nav className="flex flex-1 flex-col space-y-1 overflow-y-auto p-3">
              {links.map((link) => (
                <MobileAccordionItem
                  key={link.label}
                  item={link}
                  onClose={() => setIsMobileMenuOpen(false)}
                />
              ))}

              {links.length > 0 && <div className="my-2 border-t border-gray-200" />}

              {!isSuperAdmin && isInAdminPage && (
                <button
                  onClick={() => {
                    navigate('/user-main');
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-4 py-2.5 text-left text-sm font-medium text-green-700 transition hover:bg-green-50"
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
                  className="px-4 py-2.5 text-left text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                >
                  관리자 모드로 이동
                </button>
              )}

              <button
                onClick={() => {
                  void handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                로그아웃
              </button>
            </nav>

            <div className="absolute right-0 bottom-0 left-0 border-t border-gray-200 bg-gray-50 p-4">
              <div className="text-xs text-gray-500">{displayLabel}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
