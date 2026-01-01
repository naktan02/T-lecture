// src/features/message/ui/MessageCard.tsx
import { Message } from '../messageApi';

interface MessageCardProps {
  message: Message;
  onClick: () => void;
}

export const MessageCard = ({ message, onClick }: MessageCardProps) => {
  const isTemporary = message.type === 'Temporary';
  const isConfirmed = message.type === 'Confirmed';

  // 본문 미리보기 (첫 줄만)
  const previewText = message.body?.split('\n')[0]?.slice(0, 50) || '내용 없음';

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
          {!message.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
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

      <p className="text-sm text-gray-700 line-clamp-2">{previewText}</p>

      <div className="mt-2 text-xs text-blue-500 font-medium">자세히 보기 →</div>
    </article>
  );
};
