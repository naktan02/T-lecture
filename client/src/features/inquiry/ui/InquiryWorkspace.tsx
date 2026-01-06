// client/src/features/inquiry/ui/InquiryWorkspace.tsx
import { ReactElement } from 'react';
import { useInquiry } from '../model/useInquiry';
import { InquiryList } from './InquiryList';
import { InquiryAnswerDrawer } from './InquiryAnswerDrawer';
import { Pagination } from '../../../shared/ui';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const PAGE_SIZE = 30;

// 상태 필터 옵션
const STATUS_OPTIONS = [
  { key: 'all', label: '전체' },
  { key: 'Waiting', label: '대기' },
  { key: 'Answered', label: '완료' },
] as const;

/**
 * 문의사항 관리 워크스페이스
 * 모든 문의사항 관련 UI와 로직을 조합
 */
export const InquiryWorkspace = (): ReactElement => {
  const {
    inquiries,
    page,
    totalPage,
    totalCount,
    waitingCount,
    statusFilter,
    setStatusFilter,
    searchInput,
    setSearchInput,
    handleSearch,
    isDrawerOpen,
    selectedInquiry,
    openDrawer,
    closeDrawer,
    handleAnswer,
    setPage,
    sortField,
    sortOrder,
    onSort,
  } = useInquiry();

  return (
    <>
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6 flex flex-col min-h-0">
        {/* 헤더 영역 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">문의사항 관리</h1>
            {waitingCount > 0 && (
              <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">
                {waitingCount}건 대기중
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* 상태 필터 */}
            <div className="flex gap-1">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setStatusFilter(option.key)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === option.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {/* 검색 */}
            <form onSubmit={handleSearch} className="flex-1 sm:flex-initial">
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="검색..."
                  className="w-full sm:w-48 pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </form>
          </div>
        </div>

        {/* 문의 목록 */}
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <InquiryList
              inquiries={inquiries}
              onInquiryClick={openDrawer}
              isAdmin={true}
              currentPage={page}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />
          </div>
          {/* 페이지네이션 */}
          <div className="border-t border-gray-200 p-3">
            <Pagination currentPage={page} totalPage={totalPage} onPageChange={setPage} />
          </div>
        </div>
      </main>

      <InquiryAnswerDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        inquiry={selectedInquiry}
        onAnswer={handleAnswer}
      />
    </>
  );
};
