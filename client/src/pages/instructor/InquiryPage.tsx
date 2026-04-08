import { ReactElement, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { showConfirm, showError, showSuccess } from '../../shared/utils';
import { InquiryList } from '../../features/inquiry/ui/InquiryList';
import { InquiryDetailModal } from '../../features/inquiry/ui/InquiryDetailModal';
import { InquiryFormModal } from '../../features/inquiry/ui/InquiryFormModal';
import { inquiryApi, Inquiry } from '../../features/inquiry/api/inquiryApi';
import { Pagination, ContentWrapper, LoadingSpinner } from '../../shared/ui';
import { UserHeader } from '../../features/user/ui/headers/UserHeader';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

const InquiryPage = (): ReactElement => {
  const { shouldRender } = useAuthGuard('INSTRUCTOR');
  const queryClient = useQueryClient();
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
        viewAs: 'instructor',
      });

      setInquiries(data.inquiries);
      setTotalPage(data.meta.lastPage);
      setTotalCount(data.meta.total);
    } catch {
      showError('문의사항을 불러오는데 실패했습니다.');
    }
  }, [page, searchQuery, sortField, sortOrder, statusFilter]);

  useEffect(() => {
    void fetchInquiries();
  }, [fetchInquiries]);

  // The instructor detail API marks answered inquiries as read.
  const handleInquiryClick = async (id: number) => {
    try {
      const inquiry = await inquiryApi.getInquiry(id, { viewAs: 'instructor' });
      setSelectedInquiry(inquiry);
      setInquiries((currentInquiries) =>
        currentInquiries.map((currentInquiry) =>
          currentInquiry.id === id ? inquiry : currentInquiry,
        ),
      );
      setIsDetailOpen(true);
      await queryClient.invalidateQueries({ queryKey: ['userHeaderCounts'] });
    } catch {
      showError('문의사항을 불러오는데 실패했습니다.');
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortField(field);
    setSortOrder('desc');
  };

  const handleCreateInquiry = async (data: { title: string; content: string }) => {
    await inquiryApi.createInquiry(data);
    await fetchInquiries();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleDeleteInquiry = async (id: number) => {
    const confirmed = await showConfirm('정말 이 문의사항을 취소하시겠습니까?');
    if (!confirmed) {
      return;
    }

    try {
      await inquiryApi.deleteInquiry(id);
      showSuccess('문의사항을 취소했습니다.');
      setIsDetailOpen(false);
      await fetchInquiries();
      await queryClient.invalidateQueries({ queryKey: ['userHeaderCounts'] });
    } catch {
      showError('문의사항 취소에 실패했습니다.');
    }
  };

  if (!shouldRender) {
    return <LoadingSpinner fullScreen message="접속 권한을 확인하는 중입니다." />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <UserHeader onRefresh={fetchInquiries} />
      <ContentWrapper>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-center">
            <p className="text-sm text-blue-800">
              시스템 이용 중 오류가 발생하거나 불편한 점이 있으시다면 언제든 개발팀(
              <a
                href="mailto:tlecture82@gmail.com"
                className="font-semibold underline hover:text-blue-900"
              >
                tlecture82@gmail.com
              </a>
              )으로 문의해 주세요.
            </p>
          </div>

          <div className="border-b border-gray-200 p-4">
            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h1 className="text-xl font-bold text-gray-900">문의사항</h1>
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4" />
                문의하기
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex gap-2">
                {(['all', 'Waiting', 'Answered'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? '전체' : status === 'Waiting' ? '대기중' : '답변완료'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSearch} className="flex-1 sm:ml-auto sm:max-w-xs">
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="검색.."
                    className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <MagnifyingGlassIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
