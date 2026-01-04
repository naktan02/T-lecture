// client/src/features/assignment-settings/ui/PenaltyManagementSection.tsx
import { ReactElement, useState } from 'react';
import {
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { usePenalties } from '../model/usePenalties';
import { ReasonItem } from '../api/penaltyApi';

/**
 * 배정 패널티 관리 탭 - 강사별 패널티 목록 및 관리
 */
export const PenaltyManagementSection = (): ReactElement => {
  const { penalties, isLoading, updatePenalty, deletePenalty } = usePenalties();
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  // 만료일 포맷 (YYYY-MM-DD)
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 만료일 input용 포맷
  const formatDateForInput = (dateStr: string): string => {
    return new Date(dateStr).toISOString().split('T')[0];
  };

  // 사유 포맷 (부대명 - 날짜)
  const formatReason = (reason: ReasonItem): string => {
    const parts = [];
    if (reason.unit) parts.push(reason.unit);
    if (reason.date) parts.push(reason.date);
    if (reason.type) parts.push(`(${reason.type})`);
    return parts.join(' ') || '-';
  };

  // 편집 시작
  const startEdit = (userId: number, expiresAt: string) => {
    setEditingUserId(userId);
    setEditValue(formatDateForInput(expiresAt));
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingUserId(null);
    setEditValue('');
  };

  // 편집 저장
  const saveEdit = (userId: number) => {
    if (editValue) {
      updatePenalty({ userId, expiresAt: new Date(editValue).toISOString() });
    }
    cancelEdit();
  };

  // 날짜 +1일
  const adjustDate = (days: number) => {
    if (!editValue) return;
    const date = new Date(editValue);
    date.setDate(date.getDate() + days);
    setEditValue(date.toISOString().split('T')[0]);
  };

  // 삭제 확인
  const handleDelete = (userId: number, userName: string | null) => {
    if (confirm(`${userName || '강사'}의 패널티를 삭제하시겠습니까?`)) {
      deletePenalty(userId);
    }
  };

  // 사유 목록 펼침/접기 토글
  const toggleExpand = (userId: number) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">배정 패널티 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          배정을 거절한 강사에게 적용된 패널티 목록입니다.
        </p>
      </div>

      {penalties.length === 0 ? (
        /* 빈 상태 */
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">✓</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">패널티 없음</h3>
          <p className="text-sm text-gray-500">현재 패널티를 받고 있는 강사가 없습니다.</p>
        </div>
      ) : (
        /* 패널티 목록 */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  강사
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  팀
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사유
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  만료일
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {penalties.map((penalty) => {
                const reasons = penalty.reasons || [];
                const hasMultipleReasons = reasons.length > 1;
                const isExpanded = expandedUserId === penalty.userId;
                const firstReason = reasons[0];

                return (
                  <tr key={penalty.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {penalty.user.name || `강사 #${penalty.userId}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {penalty.user.instructor?.team?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {reasons.length === 0 ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <div>
                          {/* 첫 번째 사유 + 펼침 버튼 */}
                          <div className="flex items-center gap-1">
                            <span>{formatReason(firstReason)}</span>
                            {hasMultipleReasons && (
                              <button
                                onClick={() => toggleExpand(penalty.userId)}
                                className="ml-1 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                                title={isExpanded ? '접기' : `+${reasons.length - 1}개 더 보기`}
                              >
                                {isExpanded ? (
                                  <ChevronUpIcon className="w-4 h-4" />
                                ) : (
                                  <span className="flex items-center text-xs text-blue-500">
                                    +{reasons.length - 1}
                                    <ChevronDownIcon className="w-3 h-3 ml-0.5" />
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                          {/* 펼쳐진 사유 목록 */}
                          {isExpanded && hasMultipleReasons && (
                            <div className="mt-2 pl-2 border-l-2 border-gray-200 space-y-1">
                              {reasons.slice(1).map((reason, idx) => (
                                <div key={idx} className="text-xs text-gray-500">
                                  {formatReason(reason)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {editingUserId === penalty.userId ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            max="2099-12-31"
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {/* +1/-1 일 버튼 */}
                          <div className="flex flex-col">
                            <button
                              onClick={() => adjustDate(1)}
                              className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                              title="+1일"
                            >
                              <ChevronUpIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => adjustDate(-1)}
                              className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                              title="-1일"
                            >
                              <ChevronDownIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-medium">
                          {formatDate(penalty.expiresAt)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      {editingUserId === penalty.userId ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => saveEdit(penalty.userId)}
                            className="p-1 text-green-500 hover:text-green-700 transition-colors"
                          >
                            <CheckIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(penalty.userId, penalty.expiresAt)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(penalty.userId, penalty.user.name)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-amber-500 text-xl">⚠️</span>
          <div>
            <p className="text-sm text-amber-800 font-medium">패널티 안내</p>
            <p className="text-xs text-amber-600 mt-1">
              패널티는 배정 거절 시 자동 추가됩니다. 만료일까지 자동 배정 우선순위가 낮아집니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
