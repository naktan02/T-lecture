import { ReactElement, useEffect, useState, useCallback } from 'react';
import { showError } from '../../shared/utils/toast';
import { InquiryList } from '../../features/inquiry/ui/InquiryList';
import { InquiryAnswerDrawer } from '../../features/inquiry/ui/InquiryAnswerDrawer';
import { inquiryApi, Inquiry } from '../../features/inquiry/api/inquiryApi';
import { Pagination } from '../../shared/ui';
import { AdminHeader } from '../../features/admin/ui/headers/AdminHeader';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const AdminInquiryPage = (): ReactElement => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Waiting' | 'Answered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchInquiries = useCallback(async () => {
    try {
      const data = await inquiryApi.getInquiries({
        page,
        limit: 10,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      setInquiries(data.inquiries);
      setTotalPage(data.meta.lastPage);
      setTotalCount(data.meta.total);
      setWaitingCount(data.meta.waitingCount);
    } catch {
      showError('문의사항을 불러오는데 실패했습니다.');
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // 목록 데이터에서 직접 찾아서 사용 (API 호출 제거)
  const handleInquiryClick = (id: number) => {
    const inquiry = inquiries.find((i) => i.id === id);
    if (inquiry) {
      setSelectedInquiry(inquiry);
      setIsDrawerOpen(true);
    }
  };

  const handleAnswer = async (id: number, answer: string) => {
    await inquiryApi.answerInquiry(id, answer);
    fetchInquiries();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <AdminHeader />

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
              {(['all', 'Waiting', 'Answered'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setPage(1);
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {status === 'all' ? '전체' : status === 'Waiting' ? '대기' : '완료'}
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
              onInquiryClick={handleInquiryClick}
              isAdmin={true}
              currentPage={page}
              totalCount={totalCount}
              pageSize={10}
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
        onClose={() => setIsDrawerOpen(false)}
        inquiry={selectedInquiry}
        onAnswer={handleAnswer}
      />
    </div>
  );
};

export default AdminInquiryPage;
