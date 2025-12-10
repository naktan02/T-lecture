// client/src/shared/ui/CommonHeader.jsx

import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

/**
 * @param {string} title - 왼쪽 상단 제목
 * @param {string} userLabel - 오른쪽 유저 이름/직책
 * @param {Array} links - 네비게이션 메뉴 목록 [{ label: '메뉴명', path: '/이동경로' }]
 */
export const CommonHeader = ({ title, userLabel, links = [] }) => {
    const navigate = useNavigate();
    const location = useLocation(); // 현재 주소를 알아내서 활성화된 메뉴 강조용

    const handleLogout = () => {
        if (window.confirm('정말 로그아웃 하시겠습니까?')) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userRole');
            alert('로그아웃 되었습니다.');
            navigate('/login');
        }
    };

    return (
        <header className="flex justify-between items-center  bg-[#2c3e50] px-6 py-4 shadow-md text-white">
            {/* 1. 왼쪽: 타이틀 및 메뉴 */}
            <div className="flex items-center gap-8">
                <h1 className="text-xl font-bold text-green-400">{title}</h1>
                
                {/* 🚀 여기가 핵심: links 배열을 돌면서 메뉴 생성 */}
                <nav className="hidden md:flex gap-6 text-sm">
                    {links.map((link) => (
                        <Link 
                            key={link.path} 
                            to={link.path}
                            className={`transition-colors duration-200 ${
                                // 현재 보고 있는 페이지면 흰색(진하게), 아니면 회색(연하게)
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
            <div className="flex items-center space-x-4">
                {(() => {
                    const role = localStorage.getItem('userRole');
                    const isSuper = role === 'SUPER_ADMIN';
                    const isAdmin = role === 'ADMIN';
                    const isInAdminPage = location.pathname.startsWith('/admin');

                    // 1. 관리자 페이지에 있을 때 -> '사용자 모드로 이동'
                    if (isInAdminPage) {
                        return (
                            <button
                                onClick={() => navigate('/user-main')}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm transition duration-150"
                            >
                                사용자 모드로 이동
                            </button>
                        );
                    }

                    // 2. 일반 페이지에 있는데 관리자 권한이 있을 때 -> '관리자 모드로 이동'
                    if (isSuper || isAdmin) {
                        return (
                            <button
                                onClick={() => navigate(isSuper ? '/admin/super' : '/admin')}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition duration-150"
                            >
                                관리자 모드로 이동
                            </button>
                        );
                    }
                    return null;
                })()}

                <span className="text-sm font-medium border border-gray-600 rounded px-2 py-1 bg-gray-700">
                    {userLabel}
                </span>
                <button 
                    onClick={handleLogout}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm transition duration-150"
                >
                    로그아웃
                </button>
            </div>
        </header>
    );
};