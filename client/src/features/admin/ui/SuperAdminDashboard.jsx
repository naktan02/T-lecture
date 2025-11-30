// src/features/admin/ui/SuperAdminDashboard.jsx
import React, { useEffect, useState } from 'react';

// ✅ 분리된 컴포넌트들 Import (경로 수정됨)
import { UserListSection } from '../../../entities/user/ui/UserListSection'; 
import { AdminHeader } from '../components/AdminHeader';
import { Button } from '../../../shared/ui/Button';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const SuperAdminDashboard = () => {
    // ---------------------------------------------------------
    // 1. 상태 및 로직 (Model) - 기존 로직 유지
    // ---------------------------------------------------------
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // 필터링 로직
    const filtered = users.filter(u => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
            (u.name || '').toLowerCase().includes(q) ||
            (u.userEmail || '').toLowerCase().includes(q)
        );
    });

    // 승인된 유저 중 그룹 분류
    const approvedUsers = filtered.filter(u => u.status === 'APPROVED');
    const normalUsers = approvedUsers.filter(u => !u.instructor && !u.admin);
    const instructors = approvedUsers.filter(u => !!u.instructor && !u.admin);
    const admins = approvedUsers.filter(u => !!u.admin);

    // API 호출
    const token = localStorage.getItem('accessToken');

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                setError('');
                const token = localStorage.getItem('accessToken');

                // 1) 승인된 유저 조회
                const resApproved = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const approvedData = await resApproved.json().catch(() => []);
                if (!resApproved.ok) throw new Error(approvedData?.error || '승인 유저 조회 실패');

                // 2) 승인 대기자 조회
                const resPending = await fetch(`${API_BASE_URL}/api/v1/admin/users/pending`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const pendingData = await resPending.json().catch(() => []);
                if (!resPending.ok) throw new Error(pendingData?.error || '승인 대기 목록 조회 실패');

                setUsers(approvedData);
                setPendingUsers(pendingData);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // 기능 함수들
    const approveUser = async (userId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/approve`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || '승인 실패');

            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            // 서버가 user 객체를 돌려준다고 가정하고 목록에 추가
            if (data.user) {
                setUsers(prev => [...prev, data.user]);
            } else {
                // 데이터가 없으면 새로고침 권장 (또는 리스트만 제거)
                alert('승인되었습니다. (목록 갱신을 위해 새로고침이 필요할 수 있습니다)');
            }
        } catch (e) {
            alert(e.message);
        }
    };

    const rejectUser = async (userId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/reject`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || '거절 실패');

            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (e) {
            alert(e.message);
        }
    };

    const grantAdmin = async (userId, level = 'GENERAL') => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/admin`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ level }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || '관리자 권한 부여 실패');

            // 성공 후 로컬 상태 업데이트
            setUsers(prev =>
                prev.map(u =>
                    u.id === userId
                        ? { ...u, admin: { userId, level } }
                        : u
                )
            );
        } catch (e) {
            alert(e.message);
        }
    };

    const revokeAdmin = async (userId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/admin`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || '관리자 권한 회수 실패');

            setUsers(prev =>
                prev.map(u =>
                    u.id === userId
                        ? { ...u, admin: null }
                        : u
                )
            );
        } catch (e) {
            alert(e.message);
        }
    };

    // ---------------------------------------------------------
    // 2. UI 렌더링 - 컴포넌트 조립 (깔끔해진 부분)
    // ---------------------------------------------------------
    return (
        <div className="min-h-screen bg-gray-100">
            {/* ✅ 공통 헤더 컴포넌트 사용 */}
            <AdminHeader 
                title="슈퍼 관리자 페이지" 
                userLabel="최고관리자 님" 
            />

            <main className="p-6 max-w-7xl mx-auto">
                {/* 상단 타이틀 및 설명 */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold">관리자 권한 관리</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            강사가 아닌 일반 유저, 강사, 현재 관리자 목록을 확인하고 권한을 관리합니다.
                        </p>
                    </div>
                    
                    {/* 검색 바 */}
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="이름/이메일 검색"
                        className="border border-gray-300 rounded px-3 py-2 text-sm w-full md:w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
                        {error}
                    </div>
                )}

                {/* 로딩 및 콘텐츠 */}
                {loading ? (
                    <div className="text-center py-10 text-gray-500">데이터를 불러오는 중입니다...</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        
                        {/* 1) 일반 유저 섹션 */}
                        <UserListSection 
                            title="👤 일반 유저 (강사 아님)"
                            users={normalUsers}
                            emptyMessage="일반 유저가 없습니다."
                            renderActions={(u) => (
                                <Button 
                                    size="xsmall" 
                                    variant="primary" // 초록색 (Button.jsx 설정에 따라 다를 수 있음. 필요시 colorClass 직접 지정)
                                    className="bg-green-600 hover:bg-green-700 text-white border-none"
                                    onClick={() => grantAdmin(u.id, 'GENERAL')}
                                >
                                    관리자 부여
                                </Button>
                            )}
                        />

                        {/* 2) 강사 섹션 */}
                        <UserListSection 
                            title="📚 강사 (현 관리자 아님)"
                            users={instructors}
                            emptyMessage="강사만 있는 유저가 없습니다."
                            renderActions={(u) => (
                                <Button 
                                    size="xsmall" 
                                    className="bg-green-600 hover:bg-green-700 text-white border-none"
                                    onClick={() => grantAdmin(u.id, 'GENERAL')}
                                >
                                    관리자 부여
                                </Button>
                            )}
                        />

                        {/* 3) 승인 대기 섹션 (원래 4번째였으나 레이아웃상 중요해서 유지) */}
                        <UserListSection 
                            title="📝 가입 신청 (승인 대기)"
                            users={pendingUsers}
                            emptyMessage="승인 대기 중인 신청이 없습니다."
                            renderActions={(u) => (
                                <div className="flex gap-1 flex-col sm:flex-row">
                                    <Button 
                                        size="xsmall" 
                                        className="bg-green-600 hover:bg-green-700 text-white border-none"
                                        onClick={() => approveUser(u.id)}
                                    >
                                        승인
                                    </Button>
                                    <Button 
                                        size="xsmall" 
                                        className="bg-red-500 hover:bg-red-600 text-white border-none"
                                        onClick={() => rejectUser(u.id)}
                                    >
                                        거절
                                    </Button>
                                </div>
                            )}
                        />

                        {/* 4) 현재 관리자 섹션 (하단 혹은 4번째 컬럼으로 배치) */}
                         <div className="lg:col-span-3 xl:col-span-1">
                            <UserListSection 
                                title="🛡 현재 관리자"
                                users={admins}
                                emptyMessage="관리자가 없습니다."
                                renderActions={(u) => {
                                    // 슈퍼 관리자는 건드리지 못하게 처리
                                    if (u.admin?.level === 'SUPER') return null;
                                    return (
                                        <Button 
                                            size="xsmall" 
                                            className="bg-red-500 hover:bg-red-600 text-white border-none"
                                            onClick={() => revokeAdmin(u.id)}
                                        >
                                            권한 회수
                                        </Button>
                                    );
                                }}
                            />
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
};