// client/src/features/notice/model/useNotice.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noticeApi, Notice } from '../api/noticeApi';
import { showError, showSuccess } from '../../../shared/utils/toast';

const PAGE_SIZE = 30;

interface UseNoticeReturn {
  // 데이터
  notices: Notice[];
  page: number;
  totalPage: number;
  totalCount: number;
  isLoading: boolean;

  // 검색
  searchInput: string;
  setSearchInput: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;

  // Drawer 상태
  isDrawerOpen: boolean;
  selectedNotice: Notice | null;
  openCreateDrawer: () => void;
  openEditDrawer: (id: number) => void;
  closeDrawer: () => void;

  // CRUD
  handleSave: (data: { title: string; content: string }) => Promise<void>;
  handleDelete: (id: number) => Promise<void>;

  // 페이지네이션
  // 페이지네이션
  setPage: (page: number) => void;

  // 정렬
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export const useNotice = (): UseNoticeReturn => {
  const queryClient = useQueryClient();

  // 페이지네이션 상태
  const [page, setPageState] = useState(1);

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // 정렬 상태
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);

  // Drawer 상태
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  // 정렬 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // React Query로 데이터 조회
  const { data, isLoading } = useQuery({
    queryKey: ['notices', page, searchQuery, sortField, sortOrder],
    queryFn: () =>
      noticeApi.getNotices({
        page,
        limit: PAGE_SIZE,
        search: searchQuery || undefined,
        sortField,
        sortOrder,
      }),
  });

  // 데이터 안전 접근
  const notices = data?.notices || [];
  const totalPage = data?.meta?.lastPage || 1;
  const totalCount = data?.meta?.total || 0;

  // 생성 mutation
  const createMutation = useMutation({
    mutationFn: noticeApi.createNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      showSuccess('공지사항이 생성되었습니다.');
      setIsDrawerOpen(false);
    },
    onError: () => showError('저장에 실패했습니다.'),
  });

  // 수정 mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title: string; content: string } }) =>
      noticeApi.updateNotice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      showSuccess('공지사항이 수정되었습니다.');
      setIsDrawerOpen(false);
    },
    onError: () => showError('저장에 실패했습니다.'),
  });

  // 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: noticeApi.deleteNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      showSuccess('삭제되었습니다.');
      setIsDrawerOpen(false);
    },
    onError: () => showError('삭제에 실패했습니다.'),
  });

  // 검색
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPageState(1);
    setSearchQuery(searchInput);
  };

  // 페이지 변경
  const setPage = (newPage: number) => {
    setPageState(newPage);
  };

  // Drawer 열기/닫기
  const openCreateDrawer = () => {
    setSelectedNotice(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (id: number) => {
    const notice = notices.find((n) => n.id === id);
    if (notice) {
      setSelectedNotice(notice);
      setIsDrawerOpen(true);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  // 저장
  const handleSave = async (data: { title: string; content: string }) => {
    if (selectedNotice) {
      await updateMutation.mutateAsync({ id: selectedNotice.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  // 삭제
  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    notices,
    page,
    totalPage,
    totalCount,
    isLoading,
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
    sortField,
    sortOrder,
    onSort: handleSort,
  };
};
