import { ReactElement, useEffect, useState, useCallback } from 'react';
import { showError, showSuccess, showConfirm } from '../../shared/utils';
import { InquiryList } from '../../features/inquiry/ui/InquiryList';
import { InquiryDetailModal } from '../../features/inquiry/ui/InquiryDetailModal';
import { InquiryFormModal } from '../../features/inquiry/ui/InquiryFormModal';
import { inquiryApi, Inquiry } from '../../features/inquiry/api/inquiryApi';
import { Pagination, ContentWrapper } from '../../shared/ui';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const InquiryPage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('INSTRUCTOR');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Waiting' | 'Answered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // 정렬 상태
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);

  const fetchInquiries = useCallback(async () => {
    try {
      const data = await inquiryApi.getInquiries({
        page,
        limit: 30,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        sortField,
        sortOrder,
      });
      setInquiries(data.inquiries);
      setTotalPage(data.meta.lastPage);
      setTotalCount(data.meta.total);
    } catch {
      showError('문의사항을 불러오는데 실패했습니다.');
    }
  }, [page, statusFilter, searchQuery, sortField, sortOrder]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // 목록 데이터에서 직접 찾아서 사용 (API 호출 제거)
  const handleInquiryClick = (id: number) => {
    const inquiry = inquiries.find((i) => i.id === id);
    if (inquiry) {
      setSelectedInquiry(inquiry);
      setIsDetailOpen(true);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleCreateInquiry = async (data: { title: string; content: string }) => {
    await inquiryApi.createInquiry(data);
    fetchInquiries();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleDeleteInquiry = async (id: number) => {
    const confirmed = await showConfirm('정말 이 문의사항을 취소하시겠습니까?');
    if (!confirmed) return;

    try {
      await inquiryApi.deleteInquiry(id);
      showSuccess('문의사항이 취소되었습니다.');
      setIsDetailOpen(false);
      fetchInquiries();
    } catch {
      showError('문의사항 취소에 실패했습니다.');
    }
  };

  if (!shouldRender) return <></>;

  return (
    <div className="min-h-screen bg-gray-100">
      <UserHeader />
      <ContentWrapper>
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          {/* 헤더 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h1 className="text-xl font-bold text-gray-900">문의사항</h1>
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                문의하기
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* 상태 필터 */}
              <div className="flex gap-2">
                {(['all', 'Waiting', 'Answered'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      statusFilter === status
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? '전체' : status === 'Waiting' ? '대기중' : '답변완료'}
                  </button>
                ))}
              </div>
              {/* 검색 */}
              <form onSubmit={handleSearch} className="flex-1 sm:max-w-xs sm:ml-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="검색..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </form>
            </div>
          </div>

          <InquiryList
            inquiries={inquiries}
            onInquiryClick={handleInquiryClick}
            currentPage={page}
            totalCount={totalCount}
            pageSize={30}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />

          {/* 페이지네이션 */}
          <div className="border-t border-gray-200 p-3">
            <Pagination currentPage={page} totalPage={totalPage} onPageChange={setPage} />
          </div>
        </div>
      </ContentWrapper>

      <InquiryDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        inquiry={selectedInquiry}
        onDelete={handleDeleteInquiry}
      />

      <InquiryFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateInquiry}
      />
    </div>
  );
};

export default InquiryPage;
