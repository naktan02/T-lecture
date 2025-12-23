// src/entities/user/ui/UserListSection.tsx
import { ReactNode, MouseEvent } from 'react';
import type { UserListItem } from '../../../shared/types';

interface UserListSectionProps {
  title: string;
  users: UserListItem[];
  emptyMessage: string;
  renderActions?: (user: UserListItem) => ReactNode;
  onRowClick?: (user: UserListItem) => void;
  height?: string;
}

/**
 * 유저 목록을 보여주는 공용 섹션 컴포넌트
 */
export const UserListSection: React.FC<UserListSectionProps> = ({
  title,
  users,
  emptyMessage,
  renderActions,
  onRowClick,
  height = 'max-h-[70vh]',
}) => {
  const handleActionClick = (e: MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
  };

  return (
    <section className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-full">
      {/* 헤더 부분 */}
      <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-xs text-gray-500">{users.length}명</span>
      </div>

      {/* 리스트 부분 */}
      <div className={`flex-1 overflow-y-auto ${height} p-3 space-y-2`}>
        {users.length === 0 && (
          <div className="text-xs text-gray-400 text-center mt-4">{emptyMessage}</div>
        )}

        {users.map((u) => (
          <div
            key={u.id}
            onClick={() => onRowClick && onRowClick(u)}
            className={`
              border rounded-md px-3 py-2 text-xs flex justify-between items-center transition-colors
              ${onRowClick ? 'cursor-pointer hover:bg-gray-50 hover:border-blue-300' : 'hover:border-gray-400'}
            `}
          >
            {/* 유저 정보 (공통) */}
            <div>
              <div className="font-semibold text-gray-800 flex items-center gap-1">
                {u.name || '이름 없음'}
                {(u.instructor as { isTeamLeader?: boolean } | undefined)?.isTeamLeader && (
                  <span className="text-[10px] text-amber-600 border border-amber-300 rounded px-1">
                    팀장
                  </span>
                )}
              </div>
              <div className="text-gray-500">{u.userEmail}</div>
              <div className="text-[11px] text-gray-400 mt-1">
                상태: {u.status}
                {u.admin && <span className="ml-1 text-blue-600">({u.admin.level})</span>}
              </div>
            </div>

            {/* 버튼 영역 (가변) */}
            <div className="flex flex-col gap-1 items-end" onClick={handleActionClick}>
              {renderActions && renderActions(u)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
