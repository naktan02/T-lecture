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
    instructorUsers,
    adminUsers,
    grantAdmin,
    revokeAdmin,
    grantInstructor,
    revokeInstructor,
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
          <h2 className="text-xl font-bold">권한 관리</h2>
          <p className="text-sm text-gray-600 mt-1">
            사용자의 강사/관리자 역할을 관리합니다. 한 사용자가 여러 역할을 가질 수 있습니다.
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1) 일반 유저 섹션 (강사 X, 관리자 X) */}
          <UserListSection
            title="👤 일반 유저"
            users={normalUsers}
            emptyMessage="일반 유저가 없습니다."
            renderActions={(u) => (
              <div className="flex gap-1 flex-col sm:flex-row">
                <Button size="xsmall" onClick={() => grantInstructor(u.id)}>
                  강사 부여
                </Button>
                <Button
                  size="xsmall"
                  variant="secondary"
                  onClick={() => grantAdmin(u.id, 'GENERAL')}
                >
                  관리자 부여
                </Button>
              </div>
            )}
          />

          {/* 2) 승인 대기 섹션 */}
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

          {/* 3) 강사 섹션 */}
          <UserListSection
            title="📚 강사 목록"
            users={instructorUsers}
            emptyMessage="강사가 없습니다."
            renderBadge={(u) =>
              u.admin ? (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                  🛡️ 관리자
                </span>
              ) : null
            }
            renderActions={(u) => (
              <div className="flex gap-1 flex-col sm:flex-row">
                <Button size="xsmall" variant="danger" onClick={() => revokeInstructor(u.id)}>
                  강사 회수
                </Button>
                {u.admin ? (
                  u.admin.level !== 'SUPER' && (
                    <Button size="xsmall" variant="secondary" onClick={() => revokeAdmin(u.id)}>
                      관리자 회수
                    </Button>
                  )
                ) : (
                  <Button
                    size="xsmall"
                    variant="secondary"
                    onClick={() => grantAdmin(u.id, 'GENERAL')}
                  >
                    관리자 부여
                  </Button>
                )}
              </div>
            )}
          />

          {/* 4) 관리자 섹션 */}
          <UserListSection
            title="🛡 관리자 목록"
            users={adminUsers}
            emptyMessage="관리자가 없습니다."
            renderBadge={(u) =>
              u.instructor ? (
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                  📚 강사
                </span>
              ) : null
            }
            renderActions={(u) => {
              const isSuper = u.admin?.level === 'SUPER';
              return (
                <div className="flex gap-1 flex-col sm:flex-row">
                  {u.instructor ? (
                    <Button
                      size="xsmall"
                      variant="secondary"
                      onClick={() => revokeInstructor(u.id)}
                    >
                      강사 회수
                    </Button>
                  ) : (
                    <Button size="xsmall" onClick={() => grantInstructor(u.id)}>
                      강사 부여
                    </Button>
                  )}
                  {!isSuper && (
                    <Button size="xsmall" variant="danger" onClick={() => revokeAdmin(u.id)}>
                      관리자 회수
                    </Button>
                  )}
                  {isSuper && <span className="text-xs text-gray-400 self-center">슈퍼관리자</span>}
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
};
