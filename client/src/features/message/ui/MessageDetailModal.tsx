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
        className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className={`
          p-4 border-b
          ${isTemporary ? 'bg-yellow-50 border-yellow-200' : ''}
          ${isConfirmed ? 'bg-green-50 border-green-200' : ''}
        `}
        >
          <div className="flex justify-between items-start">
            <div>
              <span
                className={`
                text-xs font-semibold px-2 py-1 rounded
                ${isTemporary ? 'bg-yellow-100 text-yellow-700' : ''}
                ${isConfirmed ? 'bg-green-100 text-green-700' : ''}
              `}
              >
                {isTemporary ? '📩 임시 배정' : '✅ 확정 배정'}
              </span>
              <div className="text-xs text-gray-500 mt-2">
                {message.receivedAt ? new Date(message.receivedAt).toLocaleString('ko-KR') : ''}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            >
              ×
            </button>
          </div>
        </div>

        {/* 본문 - 템플릿에서 생성된 메시지 내용 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
            {message.body || '내용이 없습니다.'}
          </div>
        </div>

        {/* 푸터 - 임시 배정 + Pending 상태일 때만 응답 버튼 */}
        {isTemporary && hasPendingAssignments && (
          <div className="p-4 bg-gray-50 border-t">
            <p className="text-sm text-gray-600 text-center mb-3">이 배정에 응답해주세요</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRespond('REJECT')}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 border-2 border-red-500 text-red-500 font-semibold rounded-lg
                         hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                거절하기
              </button>
              <button
                onClick={() => handleRespond('ACCEPT')}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-green-500 text-white font-semibold rounded-lg
                         hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                수락하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
