// src/features/message/ui/MessageCard.tsx
import { Message } from '../messageApi';

interface MessageCardProps {
  message: Message;
  onClick: () => void;
}

export const MessageCard = ({ message, onClick }: MessageCardProps) => {
  const isTemporary = message.type === 'Temporary';
  const isConfirmed = message.type === 'Confirmed';

  return (
    <article
      onClick={onClick}
      className={`
        p-4 rounded-lg border cursor-pointer transition-all
        hover:shadow-md hover:-translate-y-0.5
        ${message.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}
        ${isTemporary ? 'border-yellow-200' : ''}
        ${isConfirmed ? 'border-green-200' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {!message.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
          <span
            className={`
            text-xs font-medium px-2 py-0.5 rounded
            ${isTemporary ? 'bg-yellow-100 text-yellow-700' : ''}
            ${isConfirmed ? 'bg-green-100 text-green-700' : ''}
          `}
          >
            {isTemporary ? '임시 배정' : '확정 배정'}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {message.receivedAt ? new Date(message.receivedAt).toLocaleDateString('ko-KR') : ''}
        </span>
      </div>

      {/* 제목 표시 (변수 치환된 제목) */}
      {message.title && (
        <h3 className="text-sm font-medium text-gray-800 mb-2 line-clamp-1">{message.title}</h3>
      )}

      {/* 읽음/안읽음 상태 배지 */}
      <div className="flex justify-between items-center mt-2">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            message.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700 font-medium'
          }`}
        >
          {message.isRead ? '읽음' : '새 메시지'}
        </span>
        <span className="text-xs text-blue-500 font-medium">자세히 보기 →</span>
      </div>
    </article>
  );
};
