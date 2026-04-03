import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { noticeApi, Notice, NoticeUpsertPayload } from '../api/noticeApi';
import { showError, showSuccess } from '../../../shared/utils/toast';

const PAGE_SIZE = 30;

interface UseNoticeReturn {
  notices: Notice[];
  page: number;
  totalPage: number;
  totalCount: number;
  isLoading: boolean;
  searchInput: string;
  setSearchInput: (value: string) => void;
  handleSearch: (event: React.FormEvent) => void;
  isDrawerOpen: boolean;
  selectedNotice: Notice | null;
  openCreateDrawer: () => void;
  openEditDrawer: (id: number) => void;
  closeDrawer: () => void;
  handleSave: (data: NoticeUpsertPayload) => Promise<void>;
  handleDelete: (id: number) => Promise<void>;
  setPage: (page: number) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export const useNotice = (): UseNoticeReturn => {
  const queryClient = useQueryClient();
  const [page, setPageState] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortField(field);
    setSortOrder('desc');
  };

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

  const notices = data?.notices || [];
  const totalPage = data?.meta?.lastPage || 1;
  const totalCount = data?.meta?.total || 0;

  const createMutation = useMutation({
    mutationFn: noticeApi.createNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      showSuccess('공지사항을 생성했습니다.');
      setIsDrawerOpen(false);
    },
    onError: (error) => showError(error instanceof Error ? error.message : '저장에 실패했습니다.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: NoticeUpsertPayload }) =>
      noticeApi.updateNotice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      showSuccess('공지사항을 수정했습니다.');
      setIsDrawerOpen(false);
    },
    onError: (error) => showError(error instanceof Error ? error.message : '저장에 실패했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: noticeApi.deleteNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      showSuccess('공지사항을 삭제했습니다.');
      setIsDrawerOpen(false);
    },
    onError: (error) => showError(error instanceof Error ? error.message : '삭제에 실패했습니다.'),
  });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPageState(1);
    setSearchQuery(searchInput);
  };

  const setPage = (newPage: number) => {
    setPageState(newPage);
  };

  const openCreateDrawer = () => {
    setSelectedNotice(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (id: number) => {
    const notice = notices.find((item) => item.id === id);
    if (!notice) {
      return;
    }

    setSelectedNotice(notice);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleSave = async (data: NoticeUpsertPayload) => {
    if (selectedNotice) {
      await updateMutation.mutateAsync({ id: selectedNotice.id, data });
      return;
    }

    await createMutation.mutateAsync(data);
  };

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
