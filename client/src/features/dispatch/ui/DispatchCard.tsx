// src/features/dispatch/ui/DispatchCard.tsx
import { Dispatch } from '../dispatchApi';

interface DispatchCardProps {
  dispatch: Dispatch;
  onClick: () => void;
}

export const DispatchCard = ({ dispatch, onClick }: DispatchCardProps) => {
  const isTemporary = dispatch.type === 'Temporary';
  const isConfirmed = dispatch.type === 'Confirmed';

  // 임시 배정의 상태 확인
  const isCanceled =
    isTemporary && dispatch.assignments?.every((a) => ['Canceled', 'Rejected'].includes(a.state));
  const isAccepted = isTemporary && dispatch.assignments?.every((a) => a.state === 'Accepted');
  const isPending = isTemporary && dispatch.assignments?.some((a) => a.state === 'Pending');

  return (
    <article
      onClick={onClick}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all
        hover:shadow-md hover:-translate-y-0.5
        ${dispatch.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}
        ${isTemporary && !isCanceled ? 'border-yellow-200' : ''}
        ${isTemporary && isCanceled ? 'border-gray-200 opacity-60' : ''}
        ${isConfirmed ? 'border-green-200' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {!dispatch.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
          <span
            className={`
            text-xs font-medium px-2 py-0.5 rounded
            ${isTemporary && !isCanceled ? 'bg-yellow-100 text-yellow-700' : ''}
            ${isTemporary && isCanceled ? 'bg-gray-200 text-gray-500' : ''}
            ${isConfirmed ? 'bg-green-100 text-green-700' : ''}
          `}
          >
            {isTemporary ? '임시 배정' : '확정 배정'}
          </span>
          {/* 추가 상태 배지 */}
          {isCanceled && (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-300 text-gray-600">취소됨</span>
          )}
          {isAccepted && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
              수락완료
            </span>
          )}
          {isPending && (
            <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">
              응답대기
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {dispatch.receivedAt ? new Date(dispatch.receivedAt).toLocaleDateString('ko-KR') : ''}
        </span>
      </div>

      {/* 제목 표시 (변수 치환된 제목) */}
      {dispatch.title && (
        <h3 className="text-sm font-medium text-gray-800 mb-2 line-clamp-1">{dispatch.title}</h3>
      )}

      {/* 읽음/안읽음 상태 배지 */}
      <div className="flex justify-between items-center mt-2">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            dispatch.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700 font-medium'
          }`}
        >
          {dispatch.isRead ? '읽음' : '새 메시지'}
        </span>
        <span className="text-xs text-blue-500 font-medium">자세히 보기 →</span>
      </div>
    </article>
  );
};
