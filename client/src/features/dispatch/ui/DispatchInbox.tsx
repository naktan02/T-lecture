// src/features/dispatch/ui/DispatchInbox.tsx
import { useState } from 'react';
import { useDispatchInbox } from '../model/useDispatchInbox';
import { DispatchCard } from './DispatchCard';
import { DispatchDetailModal } from './DispatchDetailModal';
import { Dispatch } from '../dispatchApi';
import { Button, Pagination } from '../../../shared/ui';

type MobileTab = 'temporary' | 'confirmed';

export const DispatchInbox = () => {
  const { temporary, confirmed, markAsRead, error } = useDispatchInbox();
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('temporary');

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

  // 섹션 렌더 헬퍼 함수 (컴포넌트가 아닌 일반 함수로 JSX 반환)
  const renderSection = (type: 'temporary' | 'confirmed', showHeader: boolean) => {
    const data = type === 'temporary' ? temporary : confirmed;
    const title = type === 'temporary' ? '📩 임시 배정' : '✅ 확정 배정';
    const badgeColor =
      type === 'temporary' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
    const emptyMessage =
      type === 'temporary' ? '임시 배정 알림이 없습니다' : '확정 배정 알림이 없습니다';

    return (
      <section className="bg-gray-50 rounded-lg border border-gray-100 flex flex-col overflow-hidden h-full">
        {/* 섹션 헤더 - showHeader가 true일 때만 표시 */}
        {showHeader && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-800">{title}</h2>
            <span className={`px-2 py-0.5 ${badgeColor} text-xs font-medium rounded-full`}>
              {data.totalCount}
            </span>
          </div>
        )}

        {/* 발송 목록 (스크롤 영역) */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {data.isLoading ? (
            <div className="text-center text-gray-400 py-6">로딩 중...</div>
          ) : data.dispatches.length === 0 ? (
            <div className="text-center text-gray-400 py-6">{emptyMessage}</div>
          ) : (
            data.dispatches.map((d) => (
              <DispatchCard key={d.dispatchId} dispatch={d} onClick={() => handleOpenDispatch(d)} />
            ))
          )}
        </div>

        {/* 페이지네이션 (하단) */}
        <div className="border-t border-gray-100 p-2 flex-shrink-0 bg-gray-50">
          <Pagination
            currentPage={data.page}
            totalPage={data.totalPage}
            onPageChange={data.setPage}
            limit={5}
          />
        </div>
      </section>
    );
  };

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

        {/* 모바일 탭 UI (lg 미만에서만 표시) */}
        <div className="lg:hidden flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setMobileTab('temporary')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mobileTab === 'temporary'
                ? 'text-yellow-700 border-b-2 border-yellow-500 bg-yellow-50'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            📩 임시 배정
            <span
              className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                mobileTab === 'temporary'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {temporary.totalCount}
            </span>
          </button>
          <button
            onClick={() => setMobileTab('confirmed')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mobileTab === 'confirmed'
                ? 'text-green-700 border-b-2 border-green-500 bg-green-50'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            ✅ 확정 배정
            <span
              className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                mobileTab === 'confirmed'
                  ? 'bg-green-200 text-green-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {confirmed.totalCount}
            </span>
          </button>
        </div>

        {/* 모바일: 탭에 따른 섹션 표시 (lg 미만) - 헤더 숨김 */}
        <div className="lg:hidden flex-1 min-h-0 overflow-hidden p-4">
          {renderSection(mobileTab, false)}
        </div>

        {/* 데스크톱: 2컬럼 레이아웃 (lg 이상) - 헤더 표시 */}
        <div className="hidden lg:grid grid-cols-2 gap-4 p-4 flex-1 min-h-0 overflow-auto">
          {renderSection('temporary', true)}
          {renderSection('confirmed', true)}
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
