// client/src/features/notice/ui/NoticeWorkspace.tsx
import { ReactElement } from 'react';
import { useNotice } from '../model/useNotice';
import { NoticeList } from './NoticeList';
import { NoticeDrawer } from './NoticeDrawer';
import { Pagination } from '../../../shared/ui';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const PAGE_SIZE = 30;

/**
 * 공지사항 관리 워크스페이스
 * 모든 공지사항 관련 UI와 로직을 조합
 */
export const NoticeWorkspace = (): ReactElement => {
  const {
    notices,
    page,
    totalPage,
    totalCount,
    searchInput,
    setSearchInput,
    handleSearch,
    isDrawerOpen,
    selectedNotice,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    handleSave,
    handleDelete,
    setPage,
  } = useNotice();

  return (
    <>
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 md:p-6 flex flex-col min-h-0">
        {/* 헤더 영역 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">공지사항 관리</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
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
            <button
              onClick={openCreateDrawer}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm font-medium whitespace-nowrap"
            >
              + 작성
            </button>
          </div>
        </div>

        {/* 공지 목록 */}
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <NoticeList
              notices={notices}
              onNoticeClick={openEditDrawer}
              isAdmin={true}
              currentPage={page}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
            />
          </div>
          {/* 페이지네이션 */}
          <div className="border-t border-gray-200 p-3">
            <Pagination currentPage={page} totalPage={totalPage} onPageChange={setPage} />
          </div>
        </div>
      </main>

      <NoticeDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        notice={selectedNotice}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
};
