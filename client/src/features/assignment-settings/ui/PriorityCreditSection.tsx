// client/src/features/assignment-settings/ui/PriorityCreditSection.tsx
import { ReactElement, useState } from 'react';
import {
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { usePriorityCredits } from '../model/usePriorityCredits';
import { ReasonItem } from '../api/priorityCreditApi';
import { showConfirm } from '../../../shared/utils/toast';

/**
 * 우선배정 크레딧 관리 섹션
 */
export const PriorityCreditSection = (): ReactElement => {
  const { credits, isLoading, updateCredit, deleteCredit } = usePriorityCredits();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number>(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 사유 포맷 (부대명 - 날짜)
  const formatReason = (reason: ReasonItem): string => {
    const parts = [];
    if (reason.unit) parts.push(reason.unit);
    if (reason.date) parts.push(reason.date);
    if (reason.type) parts.push(`(${reason.type})`);
    return parts.join(' ') || '-';
  };

  // 편집 시작
  const startEdit = (instructorId: number, currentCredits: number) => {
    setEditingId(instructorId);
    setEditValue(currentCredits);
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue(1);
  };

  // 편집 저장
  const saveEdit = (instructorId: number) => {
    if (editValue >= 1) {
      updateCredit({ instructorId, credits: editValue });
    }
    cancelEdit();
  };

  // 삭제 확인
  const handleDelete = async (instructorId: number, userName: string | null) => {
    const confirmed = await showConfirm(
      `${userName || '강사'}의 우선배정 크레딧을 삭제하시겠습니까?`,
    );
    if (confirmed) {
      deleteCredit(instructorId);
    }
  };

  // 사유 목록 펼침/접기 토글
  const toggleExpand = (instructorId: number) => {
    setExpandedId(expandedId === instructorId ? null : instructorId);
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
        <h2 className="text-xl font-bold text-gray-800">우선배정 관리</h2>
        <p className="text-sm text-gray-500 mt-1">
          부대 사정으로 취소된 강사에게 부여된 우선배정 크레딧 목록입니다.
        </p>
      </div>

      {credits.length === 0 ? (
        /* 빈 상태 */
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">✓</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">우선배정 대상 없음</h3>
          <p className="text-sm text-gray-500">현재 우선배정 크레딧이 있는 강사가 없습니다.</p>
        </div>
      ) : (
        /* 크레딧 목록 */
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
                  크레딧
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {credits.map((credit) => {
                const reasons = credit.reasons || [];
                const hasMultipleReasons = reasons.length > 1;
                const isExpanded = expandedId === credit.instructorId;
                const firstReason = reasons[0];

                return (
                  <tr key={credit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {credit.instructor.user.name || `강사 #${credit.instructorId}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {credit.instructor.team?.name || '-'}
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
                                onClick={() => toggleExpand(credit.instructorId)}
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {editingId === credit.instructorId ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(Number(e.target.value))}
                          min={1}
                          max={10}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {credit.credits}회
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      {editingId === credit.instructorId ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => saveEdit(credit.instructorId)}
                            className="p-1 text-green-500 hover:text-green-700 transition-colors"
                          >
                            <CheckIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(credit.instructorId, credit.credits)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(credit.instructorId, credit.instructor.user.name)
                            }
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="text-green-500 text-xl">✨</span>
          <div>
            <p className="text-sm text-green-800 font-medium">우선배정 안내</p>
            <p className="text-xs text-green-600 mt-1">
              크레딧이 있는 강사는 자동 배정 시 높은 우선순위를 갖습니다. 배정되면 크레딧이 1
              감소하고, 0이 되면 목록에서 삭제됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
