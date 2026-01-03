// src/features/message/ui/MessageInbox.tsx
import { useState } from 'react';
import { useMessageInbox } from '../model/useMessageInbox';
import { MessageCard } from './MessageCard';
import { MessageDetailModal } from './MessageDetailModal';
import { Message } from '../messageApi';
import { Button, Pagination } from '../../../shared/ui';

export const MessageInbox = () => {
  const { temporary, confirmed, markAsRead, error } = useMessageInbox();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const handleOpenMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      await markAsRead(message.messageId);
    }
  };

  const handleRefresh = () => {
    temporary.refresh();
    confirmed.refresh();
  };

  const isLoading = temporary.isLoading && confirmed.isLoading;

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
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full py-4">
      {/* 제목 + 새로고침 버튼 */}
      <div className="flex justify-between items-start mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">메시지함</h1>
          <p className="text-sm text-gray-500">배정 관련 메시지를 확인하세요</p>
        </div>
        <Button variant="ghost" size="small" onClick={handleRefresh}>
          🔄 새로고침
        </Button>
      </div>

      {/* 메시지 목록 - 2컬럼, flex-1로 남은 공간 채우기 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* 임시 배정 메시지 카드 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-2 p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-800">📩 임시 배정</h2>
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
              {temporary.totalCount}
            </span>
          </div>

          {/* 메시지 목록 (스크롤 영역) */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {temporary.isLoading ? (
              <div className="text-center text-gray-400 py-8">로딩 중...</div>
            ) : temporary.messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">임시 배정 메시지가 없습니다</div>
            ) : (
              temporary.messages.map((msg) => (
                <MessageCard
                  key={msg.messageId}
                  message={msg}
                  onClick={() => handleOpenMessage(msg)}
                />
              ))
            )}
          </div>

          {/* 페이지네이션 (하단 고정) */}
          <div className="border-t border-gray-200 p-3 flex-shrink-0">
            <Pagination
              currentPage={temporary.page}
              totalPage={temporary.totalPage}
              onPageChange={temporary.setPage}
              limit={5}
            />
          </div>
        </section>

        {/* 확정 배정 메시지 카드 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-2 p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-800">✅ 확정 배정</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {confirmed.totalCount}
            </span>
          </div>

          {/* 메시지 목록 (스크롤 영역) */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {confirmed.isLoading ? (
              <div className="text-center text-gray-400 py-8">로딩 중...</div>
            ) : confirmed.messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">확정 배정 메시지가 없습니다</div>
            ) : (
              confirmed.messages.map((msg) => (
                <MessageCard
                  key={msg.messageId}
                  message={msg}
                  onClick={() => handleOpenMessage(msg)}
                />
              ))
            )}
          </div>

          {/* 페이지네이션 (하단 고정) */}
          <div className="border-t border-gray-200 p-3 flex-shrink-0">
            <Pagination
              currentPage={confirmed.page}
              totalPage={confirmed.totalPage}
              onPageChange={confirmed.setPage}
              limit={5}
            />
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
