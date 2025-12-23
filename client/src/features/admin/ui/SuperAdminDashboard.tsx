// src/features/admin/ui/SuperAdminDashboard.tsx
import { ChangeEvent } from 'react';

import { useSuperAdmin } from '../model/useSuperAdmin';
import { UserListSection } from '../../../entities/user/ui/UserListSection';
import { Button, InputField } from '../../../shared/ui';

export const SuperAdminDashboard: React.FC = () => {
  const {
    loading,
    error,
    search,
    setSearch,
    pendingUsers,
    normalUsers,
    instructors,
    admins,
    grantAdmin,
    revokeAdmin,
    approveUser,
    rejectUser,
  } = useSuperAdmin();

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearch(e.target.value);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold">관리자 권한 관리</h2>
          <p className="text-sm text-gray-600 mt-1">
            강사가 아닌 일반 유저, 강사, 현재 관리자 목록을 확인하고 권한을 관리합니다.
          </p>
        </div>

        <div className="w-full md:w-64">
          <InputField placeholder="이름/이메일 검색" value={search} onChange={handleSearchChange} />
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
          {error}
        </div>
      )}

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
              <Button size="xsmall" onClick={() => grantAdmin(u.id, 'GENERAL')}>
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
              <Button size="xsmall" onClick={() => grantAdmin(u.id, 'GENERAL')}>
                관리자 부여
              </Button>
            )}
          />

          {/* 3) 승인 대기 섹션 */}
          <UserListSection
            title="📝 가입 신청 (승인 대기)"
            users={pendingUsers}
            emptyMessage="승인 대기 중인 신청이 없습니다."
            renderActions={(u) => (
              <div className="flex gap-1 flex-col sm:flex-row">
                <Button size="xsmall" onClick={() => approveUser(u.id)}>
                  승인
                </Button>
                <Button size="xsmall" variant="danger" onClick={() => rejectUser(u.id)}>
                  거절
                </Button>
              </div>
            )}
          />

          {/* 4) 현재 관리자 섹션 */}
          <div className="lg:col-span-3 xl:col-span-1">
            <UserListSection
              title="🛡 현재 관리자"
              users={admins}
              emptyMessage="관리자가 없습니다."
              renderActions={(u) => {
                if (u.admin?.level === 'SUPER') return null;
                return (
                  <Button size="xsmall" variant="danger" onClick={() => revokeAdmin(u.id)}>
                    권한 회수
                  </Button>
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
