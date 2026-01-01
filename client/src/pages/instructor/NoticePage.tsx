import { ReactElement, useEffect, useState, useCallback } from 'react';
import { NoticeList } from '../../features/notice/ui/NoticeList';
import { NoticeDetailModal } from '../../features/notice/ui/NoticeDetailModal';
import { noticeApi, Notice } from '../../features/notice/api/noticeApi';
import { Pagination, ContentWrapper } from '../../shared/ui';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const NoticePage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('INSTRUCTOR');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const fetchNotices = useCallback(async () => {
    try {
      const data = await noticeApi.getNotices({ page, limit: 10 });
      setNotices(data.notices);
      setTotalPage(data.meta.lastPage);
    } catch {
      alert('공지사항을 불러오는데 실패했습니다.');
    }
  }, [page]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleNoticeClick = async (id: number) => {
    try {
      const notice = await noticeApi.getNotice(id);
      setSelectedNotice(notice);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      alert('공지사항 내용을 불러올 수 없습니다.');
    }
  };

  if (!shouldRender) return <></>;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <UserHeader />
      <ContentWrapper>
        <div className="flex-1 flex flex-col min-h-0 bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">공지사항</h1>
          </div>

          <div className="flex-1 overflow-auto">
            <NoticeList notices={notices} onNoticeClick={handleNoticeClick} />
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
