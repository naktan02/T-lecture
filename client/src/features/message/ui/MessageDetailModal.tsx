// src/features/message/ui/MessageDetailModal.tsx
import { Message } from '../messageApi';
import { respondToAssignmentApi } from '../../assignment/assignmentApi';
import { useState } from 'react';
import { showSuccess, showError } from '../../../shared/utils/toast';

interface MessageDetailModalProps {
  message: Message;
  onClose: () => void;
}

export const MessageDetailModal = ({ message, onClose }: MessageDetailModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const isTemporary = message.type === 'Temporary';
  const isConfirmed = message.type === 'Confirmed';

  // 배정에 대한 응답 처리 (임시 배정 메시지에서만)
  const handleRespond = async (response: 'ACCEPT' | 'REJECT') => {
    if (!message.assignments || message.assignments.length === 0) {
      showError('연결된 배정 정보가 없습니다.');
      return;
    }

    setIsProcessing(true);
    try {
      // 연결된 모든 배정에 대해 응답
      for (const assignment of message.assignments) {
        if (assignment.state === 'Pending') {
          await respondToAssignmentApi(assignment.unitScheduleId, response);
        }
      }
      showSuccess(response === 'ACCEPT' ? '배정을 수락했습니다.' : '배정을 거절했습니다.');
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : '응답 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Pending 상태의 배정이 있는지 확인
  const hasPendingAssignments = message.assignments?.some((a) => a.state === 'Pending');

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full overflow-hidden flex flex-col shadow-xl"
        style={{ height: '75vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 - 컴팩트 */}
        <div
          className={`
          px-3 py-2 border-b flex justify-between items-center
          ${isTemporary ? 'bg-yellow-50 border-yellow-200' : ''}
          ${isConfirmed ? 'bg-green-50 border-green-200' : ''}
        `}
        >
          <div className="flex items-center gap-2">
            <span
              className={`
              text-xs font-medium px-1.5 py-0.5 rounded
              ${isTemporary ? 'bg-yellow-100 text-yellow-700' : ''}
              ${isConfirmed ? 'bg-green-100 text-green-700' : ''}
            `}
            >
              {isTemporary ? '📩 임시 배정' : '✅ 확정 배정'}
            </span>
            <span className="text-[10px] text-gray-400">
              {message.receivedAt ? new Date(message.receivedAt).toLocaleString('ko-KR') : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-sm"
          >
            ×
          </button>
        </div>

        {/* 본문 - 카톡처럼 작은 글씨 */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="whitespace-pre-wrap text-gray-700 text-[13px] leading-relaxed">
            {message.body || '내용이 없습니다.'}
          </div>
        </div>

        {/* 푸터 - 상태별 UI */}
        {isTemporary && (
          <div className="px-3 py-2 bg-gray-50 border-t">
            {/* 취소된 배정 */}
            {message.assignments?.every((a) => ['Canceled', 'Rejected'].includes(a.state)) && (
              <div className="text-center py-2">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-600 text-sm font-medium rounded-full">
                  🚫 취소된 배정
                </span>
                <p className="text-xs text-gray-400 mt-2">
                  이 배정은 관리자에 의해 취소되었습니다.
                </p>
              </div>
            )}
            {/* 이미 응답한 배정 */}
            {message.assignments?.every((a) => a.state === 'Accepted') && (
              <div className="text-center py-2">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  ✅ 수락 완료
                </span>
              </div>
            )}
            {/* Pending 상태의 배정이 있는 경우에만 버튼 표시 */}
            {hasPendingAssignments && (
              <>
                <p className="text-xs text-gray-500 text-center mb-2">이 배정에 응답해주세요</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond('REJECT')}
                    disabled={isProcessing}
                    className="flex-1 py-2 px-3 border border-red-400 text-red-500 text-sm font-medium rounded-md
                             hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    거절하기
                  </button>
                  <button
                    onClick={() => handleRespond('ACCEPT')}
                    disabled={isProcessing}
                    className="flex-1 py-2 px-3 bg-green-500 text-white text-sm font-medium rounded-md
                             hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    수락하기
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
