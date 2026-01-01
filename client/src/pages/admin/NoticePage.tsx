import { ReactElement, useEffect, useState, useCallback } from 'react';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { NoticeList } from '../../features/notice/ui/NoticeList';
import { NoticeDrawer } from '../../features/notice/ui/NoticeDrawer';
import { noticeApi, Notice } from '../../features/notice/api/noticeApi';
import { Pagination } from '../../shared/ui';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const AdminNoticePage = (): ReactElement => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchNotices = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await noticeApi.getNotices({
        page,
        limit: 20,
        search: searchQuery || undefined,
      });
      setNotices(data.notices);
      setTotalPage(data.meta.lastPage);
      setTotalCount(data.meta.total);
    } catch (error) {
      console.error('Failed to fetch notices', error);
      alert('공지사항을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
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

  const handleCreate = () => {
    setSelectedNotice(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = async (id: number) => {
    try {
      const notice = await noticeApi.getNotice(id);
      setSelectedNotice(notice);
      setIsDrawerOpen(true);
    } catch (error) {
      console.error(error);
      alert('공지사항 상세 정보를 불러오지 못했습니다.');
    }
  };

  const handleSave = async (data: { title: string; content: string }) => {
    try {
      if (selectedNotice) {
        await noticeApi.updateNotice(selectedNotice.id, data);
        alert('공지사항이 수정되었습니다.');
      } else {
        await noticeApi.createNotice(data);
        alert('공지사항이 생성되었습니다.');
      }
      setIsDrawerOpen(false);
      fetchNotices();
    } catch (error) {
      console.error(error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await noticeApi.deleteNotice(id);
      alert('삭제되었습니다.');
      setIsDrawerOpen(false);
      fetchNotices();
    } catch (error) {
      console.error(error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleTogglePin = async (id: number) => {
    try {
      await noticeApi.togglePin(id);
      fetchNotices();
    } catch (error) {
      console.error(error);
      alert('고정 상태 변경에 실패했습니다.');
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <AdminHeader />

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
              onClick={handleCreate}
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
              onNoticeClick={handleEdit}
              isAdmin={true}
              currentPage={page}
              totalCount={totalCount}
              pageSize={20}
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
        onClose={() => setIsDrawerOpen(false)}
        notice={selectedNotice}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default AdminNoticePage;
