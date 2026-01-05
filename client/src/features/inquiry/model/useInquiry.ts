// client/src/features/inquiry/model/useInquiry.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inquiryApi, Inquiry } from '../api/inquiryApi';
import { showError } from '../../../shared/utils/toast';

const PAGE_SIZE = 30;

type StatusFilter = 'all' | 'Waiting' | 'Answered';

interface UseInquiryReturn {
  // 데이터
  inquiries: Inquiry[];
  page: number;
  totalPage: number;
  totalCount: number;
  waitingCount: number;
  isLoading: boolean;

  // 필터
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;

  // 검색
  searchInput: string;
  setSearchInput: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;

  // Drawer 상태
  isDrawerOpen: boolean;
  selectedInquiry: Inquiry | null;
  openDrawer: (id: number) => void;
  closeDrawer: () => void;

  // 답변
  handleAnswer: (id: number, answer: string) => Promise<void>;

  // 페이지네이션
  setPage: (page: number) => void;
}

export const useInquiry = (): UseInquiryReturn => {
  const queryClient = useQueryClient();

  // 페이지네이션 상태
  const [page, setPageState] = useState(1);

  // 필터 상태
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>('all');

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Drawer 상태
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  // React Query로 데이터 조회
  const { data, isLoading } = useQuery({
    queryKey: ['inquiries', page, statusFilter, searchQuery],
    queryFn: () =>
      inquiryApi.getInquiries({
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      }),
  });

  // 데이터 안전 접근
  const inquiries = data?.inquiries || [];
  const totalPage = data?.meta?.lastPage || 1;
  const totalCount = data?.meta?.total || 0;
  const waitingCount = data?.meta?.waitingCount || 0;

  // 답변 mutation
  const answerMutation = useMutation({
    mutationFn: ({ id, answer }: { id: number; answer: string }) =>
      inquiryApi.answerInquiry(id, answer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
    onError: () => showError('답변 저장에 실패했습니다.'),
  });

  // 상태 필터 변경
  const setStatusFilter = (status: StatusFilter) => {
    setStatusFilterState(status);
    setPageState(1);
  };

  // 페이지 변경
  const setPage = (newPage: number) => {
    setPageState(newPage);
  };

  // 검색
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPageState(1);
    setSearchQuery(searchInput);
  };

  // Drawer 열기/닫기
  const openDrawer = (id: number) => {
    const inquiry = inquiries.find((i) => i.id === id);
    if (inquiry) {
      setSelectedInquiry(inquiry);
      setIsDrawerOpen(true);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  // 답변
  const handleAnswer = async (id: number, answer: string) => {
    await answerMutation.mutateAsync({ id, answer });
  };

  return {
    inquiries,
    page,
    totalPage,
    totalCount,
    waitingCount,
    isLoading,
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
  };
};
