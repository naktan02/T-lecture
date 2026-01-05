// client/src/features/userManagement/ui/UserList.tsx
import { ReactElement, ChangeEvent } from 'react';
import { EmptyState } from '../../../shared/ui';
import type { User } from '../api/userManagementApi';

interface UserListProps {
  users?: User[];
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  onToggleAll?: (isChecked: boolean) => void;
  onUserClick?: (user: User) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

// 역할 정보 헬퍼
const getRoleInfo = (user: User): { label: string; bgColor: string; textColor: string } => {
  if (user.admin) {
    const level = user.admin.level === 'SUPER' ? '슈퍼관리자' : '관리자';
    return {
      label: level,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
    };
  }
  if (user.instructor) {
    return { label: '강사', bgColor: 'bg-green-100', textColor: 'text-green-700' };
  }
  return { label: '일반', bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
};

// 상태 정보 헬퍼
const getStatusInfo = (status: string): { label: string; bgColor: string; textColor: string } => {
  switch (status) {
    case 'PENDING':
      return {
        label: '승인 대기',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
      };
    case 'APPROVED':
      return {
        label: '활동중',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
      };
    case 'RESTING':
      return {
        label: '휴식중',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
      };
    case 'INACTIVE':
      return {
        label: '비활성',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
      };
    default:
      return {
        label: status,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
      };
  }
};

// 강사 분류 헬퍼
const getCategoryLabel = (category?: string | null): string => {
  switch (category) {
    case 'Main':
      return '주강사';
    case 'Co':
      return '보조강사';
    case 'Assistant':
      return '조교';
    case 'Practicum':
      return '실습';
    default:
      return '-';
  }
};

export const UserList = ({
  users = [],
  selectedIds = [],
  onToggleSelect,
  onToggleAll,
  onUserClick,
  onApprove,
  onReject,
  sortField,
  sortOrder,
  onSort,
}: UserListProps): ReactElement => {
  if (!users || !Array.isArray(users) || users.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title="유저가 없습니다"
        description="검색 조건을 변경하거나 필터를 조정해보세요."
      />
    );
  }

  const isAllSelected = users.length > 0 && users.every((u) => selectedIds.includes(u.id));

  const handleToggleAll = (e: ChangeEvent<HTMLInputElement>): void => {
    onToggleAll?.(e.target.checked);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1 text-xs">⇅</span>;
    return sortOrder === 'asc' ? (
      <span className="text-blue-600 ml-1">↑</span>
    ) : (
      <span className="text-blue-600 ml-1">↓</span>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
            <tr className="text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
              <th className="px-4 py-3 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                />
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('name')}
              >
                이름 {getSortIcon('name')}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('email')}
              >
                이메일 {getSortIcon('email')}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('role')}
              >
                유형 {getSortIcon('role')}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('status')}
              >
                상태 {getSortIcon('status')}
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                onClick={() => onSort?.('team')}
              >
                소속 {getSortIcon('team')}
              </th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const isSelected = selectedIds.includes(user.id);
              const roleInfo = getRoleInfo(user);
              const statusInfo = getStatusInfo(user.status);
              const isPending = user.status === 'PENDING';

              return (
                <tr
                  key={user.id}
                  className={`
                    transition-all duration-200 cursor-pointer
                    ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => onUserClick?.(user)}
                >
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(user.id)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {user.name || '이름 없음'}
                      </span>
                      {user.instructor?.isTeamLeader && (
                        <span className="text-[10px] text-amber-600 border border-amber-300 rounded px-1">
                          팀장
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">{user.userEmail || '-'}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full ${roleInfo.bgColor} ${roleInfo.textColor}`}
                    >
                      {roleInfo.label}
                    </span>
                    {user.instructor?.category && (
                      <span className="ml-1 text-xs text-gray-500">
                        ({getCategoryLabel(user.instructor.category)})
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">
                    {user.instructor?.team?.name || '-'}
                    {user.instructor?.generation && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({user.instructor.generation}기)
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {isPending ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => onApprove?.(user.id)}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => onReject?.(user.id)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          거절
                        </button>
                      </div>
                    ) : (
                      <svg
                        className="w-5 h-5 text-gray-400 ml-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 뷰 */}
      <div className="md:hidden p-3 space-y-3 overflow-auto">
        {/* 모바일 전체 선택 */}
        <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleToggleAll}
            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-gray-600">전체 선택</span>
          <span className="text-xs text-gray-400 ml-auto">{users.length}명</span>
        </div>

        {users.map((user) => {
          const isSelected = selectedIds.includes(user.id);
          const roleInfo = getRoleInfo(user);
          const statusInfo = getStatusInfo(user.status);
          const isPending = user.status === 'PENDING';

          return (
            <div
              key={user.id}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${
                  isSelected
                    ? 'border-green-400 bg-green-50/50 shadow-sm'
                    : 'border-gray-200 bg-white active:bg-gray-50'
                }
              `}
              onClick={() => onUserClick?.(user)}
            >
              {/* 체크박스 */}
              <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect?.(user.id)}
                  className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
              </div>

              {/* 콘텐츠 */}
              <div className="ml-8">
                {/* 상단: 이름 + 뱃지 */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-1">
                      {user.name || '이름 없음'}
                      {user.instructor?.isTeamLeader && (
                        <span className="text-[10px] text-amber-600 border border-amber-300 rounded px-1">
                          팀장
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${roleInfo.bgColor} ${roleInfo.textColor}`}
                      >
                        {roleInfo.label}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  {!isPending && (
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </div>

                {/* 정보 */}
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div>📧 {user.userEmail || '-'}</div>
                  {user.instructor?.team && (
                    <div>
                      🏢 {user.instructor.team.name}
                      {user.instructor.generation && (
                        <span className="text-gray-400"> ({user.instructor.generation}기)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 승인 대기 액션 */}
                {isPending && (
                  <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onApprove?.(user.id)}
                      className="flex-1 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => onReject?.(user.id)}
                      className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      거절
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
