import { ReactElement, useEffect, useState, useCallback } from 'react';
import { showError } from '../../shared/utils/toast';
import { NoticeList } from '../../features/notice/ui/NoticeList';
import { NoticeDetailModal } from '../../features/notice/ui/NoticeDetailModal';
import { noticeApi, Notice } from '../../features/notice/api/noticeApi';
import { Pagination, ContentWrapper } from '../../shared/ui';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const NoticePage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('INSTRUCTOR');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchNotices = useCallback(async () => {
    try {
      const data = await noticeApi.getNotices({
        page,
        limit: 30,
        search: searchQuery || undefined,
      });
      setNotices(data.notices);
      setTotalPage(data.meta.lastPage);
      setTotalCount(data.meta.total);
    } catch {
      showError('공지사항을 불러오는데 실패했습니다.');
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  // 목록 데이터에서 직접 찾아서 사용 (API 호출 제거)
  const handleNoticeClick = (id: number) => {
    const notice = notices.find((n) => n.id === id);
    if (notice) {
      setSelectedNotice(notice);
      setIsModalOpen(true);
    }
  };

  if (!shouldRender) return <></>;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <UserHeader />
      <ContentWrapper>
        <div className="flex-1 flex flex-col min-h-0 bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          {/* 헤더 + 검색 */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">공지사항</h1>
            <form onSubmit={handleSearch}>
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

          <div className="flex-1 overflow-auto">
            <NoticeList
              notices={notices}
              onNoticeClick={handleNoticeClick}
              currentPage={page}
              totalCount={totalCount}
              pageSize={30}
            />
          </div>

          <div className="border-t border-gray-200 p-3">
            <Pagination currentPage={page} totalPage={totalPage} onPageChange={setPage} />
          </div>
        </div>
      </ContentWrapper>

      <NoticeDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notice={selectedNotice}
      />
    </div>
  );
};

export default NoticePage;
