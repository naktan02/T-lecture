// src/features/message/ui/MessageInbox.tsx
import { useState } from 'react';
import { useMessageInbox } from '../model/useMessageInbox';
import { MessageCard } from './MessageCard';
import { MessageDetailModal } from './MessageDetailModal';
import { Message } from '../messageApi';
import { Button } from '../../../shared/ui';

export const MessageInbox = () => {
  const { messages, notices, isLoading, error, markAsRead, refresh } = useMessageInbox();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const handleOpenMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      await markAsRead(message.messageId);
    }
  };

  // 메시지 분류
  const temporaryMessages = messages.filter((m) => m.type === 'Temporary');
  const confirmedMessages = messages.filter((m) => m.type === 'Confirmed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">메시지를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* 제목 + 새로고침 버튼 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">메시지함</h1>
          <p className="text-sm text-gray-500">배정 관련 메시지를 확인하세요</p>
        </div>
        <Button variant="ghost" size="small" onClick={refresh}>
          🔄 새로고침
        </Button>
      </div>

      {/* 공지사항 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-blue-800 mb-2">📢 공지사항</h2>
        {notices.length > 0 ? (
          <div className="space-y-2">
            {notices.slice(0, 3).map((notice) => (
              <div key={notice.id} className="text-sm text-blue-700">
                {notice.title}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-blue-600">등록된 공지사항이 없습니다.</p>
        )}
      </div>

      {/* 메시지 목록 - 2컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 임시 배정 메시지 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-800">📩 임시 배정</h2>
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
              {temporaryMessages.length}
            </span>
          </div>
          <div className="space-y-3">
            {temporaryMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-gray-100 rounded-lg">
                임시 배정 메시지가 없습니다
              </div>
            ) : (
              temporaryMessages.map((msg) => (
                <MessageCard
                  key={msg.messageId}
                  message={msg}
                  onClick={() => handleOpenMessage(msg)}
                />
              ))
            )}
          </div>
        </section>

        {/* 확정 배정 메시지 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-800">✅ 확정 배정</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {confirmedMessages.length}
            </span>
          </div>
          <div className="space-y-3">
            {confirmedMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-gray-100 rounded-lg">
                확정 배정 메시지가 없습니다
              </div>
            ) : (
              confirmedMessages.map((msg) => (
                <MessageCard
                  key={msg.messageId}
                  message={msg}
                  onClick={() => handleOpenMessage(msg)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* 메시지 상세 모달 */}
      {selectedMessage && (
        <MessageDetailModal message={selectedMessage} onClose={() => setSelectedMessage(null)} />
      )}
    </div>
  );
};
