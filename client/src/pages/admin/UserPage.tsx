// client/src/pages/admin/UserPage.tsx
import { useState, ReactElement } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { useUserManagement } from '../../features/userManagement/model/useUserManagement';
import { UserToolbar } from '../../features/userManagement/ui/UserToolbar';
import { UserList } from '../../features/userManagement/ui/UserList';
import { UserDetailDrawer } from '../../features/userManagement/ui/UserDetailDrawer';
import { ConfirmModal, Pagination } from '../../shared/ui';
import type { User } from '../../features/userManagement/api/userManagementApi';

interface SearchParams {
  status: string;
  role: string;
  name: string;
  teamId: string;
  category: string;
  availableOn: string;
}

const UserPage = (): ReactElement => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    status: 'ALL',
    role: '',
    name: '',
    teamId: '',
    category: '',
    availableOn: '',
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 다중 선택 상태 관리
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 일괄 액션 확인 모달 상태
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);

  const {
    users,
    meta,
    page,
    setPage,
    isLoading,
    updateUser,
    deleteUser,
    approveUser,
    rejectUser,
    approveUsersBulk,
    rejectUsersBulk,
  } = useUserManagement({
    ...searchParams,
    status: searchParams.status === 'ALL' ? undefined : searchParams.status,
    teamId: searchParams.teamId || undefined,
    category: searchParams.category || undefined,
    availableOn: searchParams.availableOn || undefined,
  });

  // 승인 대기 유저 수 계산
  const pendingCount = users.filter((u) => u.status === 'PENDING').length;

  // 검색 핸들러
  const handleSearch = (newParams: SearchParams): void => {
    setSearchParams(newParams);
    setPage(1);
    setSelectedIds([]);
  };

  // 개별 선택 토글
  const handleToggleSelect = (id: number): void => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // 전체 선택 토글 (현재 페이지)
  const handleToggleAll = (isChecked: boolean): void => {
    if (isChecked) {
      const allIds = users.map((u) => u.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  // 일괄 승인/거절 핸들러
  const handleBulkAction = async (): Promise<void> => {
    if (selectedIds.length === 0 || !bulkAction) return;

    try {
      if (bulkAction === 'approve') {
        await approveUsersBulk(selectedIds);
      } else {
        await rejectUsersBulk(selectedIds);
      }
      setSelectedIds([]);
      setBulkAction(null);
    } catch (e) {
      console.error(e);
    }
  };

  // 선택된 유저 중 승인 대기 유저만 필터링
  const selectedPendingIds = users
    .filter((u) => selectedIds.includes(u.id) && u.status === 'PENDING')
    .map((u) => u.id);

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <AdminHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6 flex flex-col min-h-0">
        {/* 툴바 영역 */}
        <div className="shrink-0 mb-3 md:mb-4">
          <UserToolbar
            onSearch={handleSearch}
            totalCount={meta?.total || 0}
            pendingCount={searchParams.status === 'ALL' ? pendingCount : undefined}
          />
        </div>

        {/* 선택 액션 바 */}
        {selectedIds.length > 0 && (
          <div className="shrink-0 mb-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-y-2 justify-between items-center bg-green-50 p-3 px-4 rounded-xl border border-green-200">
              <div className="flex flex-wrap items-center gap-2 mr-2">
                <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {selectedIds.length}
                </span>
                <span className="text-sm text-green-800 font-medium whitespace-nowrap">
                  명 선택됨
                </span>
              </div>
              <div className="flex gap-2 ml-auto">
                {/* 승인 대기 유저가 선택되어 있을 때만 표시 */}
                {selectedPendingIds.length > 0 && (
                  <>
                    <button
                      onClick={() => setBulkAction('approve')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg
                                hover:bg-amber-600 active:scale-95 transition-all text-sm font-medium"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      일괄 승인 ({selectedPendingIds.length})
                    </button>
                    <button
                      onClick={() => setBulkAction('reject')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg
                                hover:bg-red-600 active:scale-95 transition-all text-sm font-medium"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      일괄 거절
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 리스트 영역 */}
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">데이터를 불러오는 중...</p>
            </div>
          ) : (
            <UserList
              users={users}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleAll={handleToggleAll}
              onUserClick={(u: User) => {
                setSelectedUser(u);
                setIsDrawerOpen(true);
              }}
              onApprove={async (id) => {
                await approveUser(id);
              }}
              onReject={async (id) => {
                await rejectUser(id);
              }}
            />
          )}
        </div>

        {/* 페이지네이션 */}
        <div className="shrink-0 py-3 md:py-4">
          <Pagination currentPage={page} totalPage={meta?.lastPage || 1} onPageChange={setPage} />
        </div>
      </main>

      <UserDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={selectedUser}
        onUpdate={updateUser}
        onDelete={(id) => {
          deleteUser(id);
          setIsDrawerOpen(false);
        }}
        onApprove={approveUser}
        onReject={rejectUser}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="유저 삭제"
        message={`선택한 유저를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.`}
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        onConfirm={() => {
          // 삭제 로직
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* 일괄 액션 확인 모달 */}
      <ConfirmModal
        isOpen={!!bulkAction}
        title={bulkAction === 'approve' ? '일괄 승인' : '일괄 거절'}
        message={
          bulkAction === 'approve'
            ? `선택한 ${selectedPendingIds.length}명의 유저를 승인하시겠습니까?`
            : `선택한 ${selectedPendingIds.length}명의 유저를 거절하시겠습니까? 거절된 유저의 데이터는 삭제됩니다.`
        }
        confirmText={bulkAction === 'approve' ? '승인' : '거절'}
        cancelText="취소"
        confirmVariant={bulkAction === 'approve' ? undefined : 'danger'}
        onConfirm={handleBulkAction}
        onCancel={() => setBulkAction(null)}
      />
    </div>
  );
};

export default UserPage;
