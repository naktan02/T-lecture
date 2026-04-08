import { ReactElement, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { showError } from '../../shared/utils/toast';
import { NoticeList } from '../../features/notice/ui/NoticeList';
import { NoticeDetailModal } from '../../features/notice/ui/NoticeDetailModal';
import { noticeApi, Notice } from '../../features/notice/api/noticeApi';
import { Pagination, ContentWrapper, LoadingSpinner } from '../../shared/ui';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const NoticePage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('INSTRUCTOR');
  const queryClient = useQueryClient();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);

  const fetchNotices = useCallback(async () => {
    if (!shouldRender) {
      return;
    }

    try {
      const data = await noticeApi.getNotices({
        page,
        limit: 30,
        search: searchQuery || undefined,
        sortField,
        sortOrder,
        viewAs: 'instructor',
      });

      setNotices(data.notices);
      setTotalPage(data.meta.lastPage);
      setTotalCount(data.meta.total);
    } catch {
      showError('공지사항을 불러오는데 실패했습니다.');
    }
  }, [page, searchQuery, shouldRender, sortField, sortOrder]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    void fetchNotices();
  }, [fetchNotices, shouldRender]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortField(field);
    setSortOrder('desc');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  // The instructor detail API increments view count and marks the notice as read.
  const handleNoticeClick = async (id: number) => {
    try {
      const notice = await noticeApi.getNotice(id, { viewAs: 'instructor' });
      setSelectedNotice(notice);
      setNotices((currentNotices) =>
        currentNotices.map((currentNotice) => (currentNotice.id === id ? notice : currentNotice)),
      );
      setIsModalOpen(true);
      await queryClient.invalidateQueries({ queryKey: ['userHeaderCounts'] });
    } catch {
      showError('공지사항을 불러오는데 실패했습니다.');
    }
  };

  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="접속 권한을 확인하는 중입니다." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <UserHeader onRefresh={fetchNotices} />
      <ContentWrapper>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-start justify-between gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center">
            <h1 className="text-xl font-bold text-gray-900">공지사항</h1>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="검색.."
                  className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:w-48"
                />
                <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </form>
          </div>

          <NoticeList
            notices={notices}
            onNoticeClick={handleNoticeClick}
            currentPage={page}
            totalCount={totalCount}
            pageSize={30}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />

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
