// src/features/dispatch/ui/DispatchInbox.tsx
import { useState } from 'react';
import { useDispatchInbox } from '../model/useDispatchInbox';
import { DispatchCard } from './DispatchCard';
import { DispatchDetailModal } from './DispatchDetailModal';
import { Dispatch } from '../dispatchApi';
import { Button, Pagination } from '../../../shared/ui';

export const DispatchInbox = () => {
  const { temporary, confirmed, markAsRead, error } = useDispatchInbox();
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);

  const handleOpenDispatch = async (dispatch: Dispatch) => {
    setSelectedDispatch(dispatch);
    if (!dispatch.isRead) {
      await markAsRead(dispatch.dispatchId);
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
        <div className="text-gray-500">발송함을 불러오는 중...</div>
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
      {/* 전체 카드 컨테이너 - 공지사항과 동일한 스타일 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* 제목 + 새로고침 버튼 (카드 내부 상단) */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-800">배정 알림함</h1>
            <p className="text-sm text-gray-500 mt-1">배정 관련 알림을 확인하세요</p>
          </div>
          <Button variant="ghost" size="small" onClick={handleRefresh}>
            🔄 새로고침
          </Button>
        </div>

        {/* 발송 목록 - 2컬럼 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 flex-1 min-h-0 overflow-auto">
          {/* 임시 배정 섹션 */}
          <section className="bg-gray-50 rounded-lg border border-gray-100 flex flex-col overflow-hidden">
            {/* 섹션 헤더 */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-800">📩 임시 배정</h2>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                {temporary.totalCount}
              </span>
            </div>

            {/* 발송 목록 (스크롤 영역) */}
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {temporary.isLoading ? (
                <div className="text-center text-gray-400 py-6">로딩 중...</div>
              ) : temporary.dispatches.length === 0 ? (
                <div className="text-center text-gray-400 py-6">임시 배정 알림이 없습니다</div>
              ) : (
                temporary.dispatches.map((d) => (
                  <DispatchCard
                    key={d.dispatchId}
                    dispatch={d}
                    onClick={() => handleOpenDispatch(d)}
                  />
                ))
              )}
            </div>

            {/* 페이지네이션 (하단) */}
            <div className="border-t border-gray-100 p-2 flex-shrink-0 bg-gray-50">
              <Pagination
                currentPage={temporary.page}
                totalPage={temporary.totalPage}
                onPageChange={temporary.setPage}
                limit={5}
              />
            </div>
          </section>

          {/* 확정 배정 섹션 */}
          <section className="bg-gray-50 rounded-lg border border-gray-100 flex flex-col overflow-hidden">
            {/* 섹션 헤더 */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-800">✅ 확정 배정</h2>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                {confirmed.totalCount}
              </span>
            </div>

            {/* 발송 목록 (스크롤 영역) */}
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {confirmed.isLoading ? (
                <div className="text-center text-gray-400 py-6">로딩 중...</div>
              ) : confirmed.dispatches.length === 0 ? (
                <div className="text-center text-gray-400 py-6">확정 배정 알림이 없습니다</div>
              ) : (
                confirmed.dispatches.map((d) => (
                  <DispatchCard
                    key={d.dispatchId}
                    dispatch={d}
                    onClick={() => handleOpenDispatch(d)}
                  />
                ))
              )}
            </div>

            {/* 페이지네이션 (하단) */}
            <div className="border-t border-gray-100 p-2 flex-shrink-0 bg-gray-50">
              <Pagination
                currentPage={confirmed.page}
                totalPage={confirmed.totalPage}
                onPageChange={confirmed.setPage}
                limit={5}
              />
            </div>
          </section>
        </div>
      </div>

      {/* 상세 모달 */}
      {selectedDispatch && (
        <DispatchDetailModal
          dispatch={selectedDispatch}
          onClose={() => setSelectedDispatch(null)}
        />
      )}
    </div>
  );
};
