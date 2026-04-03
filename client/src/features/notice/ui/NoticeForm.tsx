import { ChangeEvent, ReactElement, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { showError } from '../../../shared/utils/toast';
import { getTeams, Team } from '../../settings/settingsApi';
import { userManagementApi, User } from '../../userManagement/api/userManagementApi';
import { NoticeAttachment, noticeApi, NoticeUpsertPayload } from '../api/noticeApi';

type TargetType = 'ALL' | 'TEAM' | 'INDIVIDUAL';

interface NoticeFormData {
  title: string;
  content: string;
  isPinned?: boolean;
  targetType: TargetType;
  targetTeamIds?: number[];
  targetUserIds?: number[];
}

interface NoticeFormProps {
  initialData?: Partial<NoticeFormData>;
  existingAttachments?: NoticeAttachment[];
  onSubmit: (data: NoticeUpsertPayload) => Promise<void>;
  isLoading?: boolean;
  onCancel: () => void;
  isEditMode?: boolean;
}

const NOTICE_ATTACHMENT_MAX_FILES = 10;
const NOTICE_ATTACHMENT_MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const NOTICE_ATTACHMENT_ACCEPT = '.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp';

const formatBytes = (size: number) => {
  const mb = size / (1024 * 1024);
  return `${mb.toFixed(mb >= 1 ? 1 : 2)}MB`;
};

export const NoticeForm = ({
  initialData,
  existingAttachments = [],
  onSubmit,
  isLoading,
  onCancel,
  isEditMode = false,
}: NoticeFormProps): ReactElement => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoticeFormData>({
    defaultValues: initialData || { title: '', content: '', isPinned: false, targetType: 'ALL' },
  });

  const targetType = useWatch({ control, name: 'targetType' });
  const isPinned = useWatch({ control, name: 'isPinned' });
  const keptExistingAttachments = existingAttachments.filter(
    (attachment) => !removedAttachmentIds.includes(attachment.id),
  );
  const totalAttachmentSize =
    keptExistingAttachments.reduce((sum, attachment) => sum + attachment.size, 0) +
    selectedFiles.reduce((sum, file) => sum + file.size, 0);

  useEffect(() => {
    getTeams()
      .then(setTeams)
      .catch(() => showError('팀 목록을 불러오지 못했습니다.'));
  }, []);

  useEffect(() => {
    if (targetType !== 'INDIVIDUAL') {
      return;
    }

    userManagementApi
      .getUsers({ status: 'APPROVED', limit: 100 })
      .then((res) => setUsers(res.data))
      .catch(() => showError('강사 목록을 불러오지 못했습니다.'));
  }, [targetType]);

  useEffect(() => {
    if (!initialData) {
      reset({ title: '', content: '', isPinned: false, targetType: 'ALL' });
      setSelectedTeamIds([]);
      setSelectedUserIds([]);
      setSelectedFiles([]);
      setRemovedAttachmentIds([]);
      return;
    }

    reset(initialData);
    setSelectedTeamIds(initialData.targetTeamIds || []);
    setSelectedUserIds(initialData.targetUserIds || []);
    setSelectedFiles([]);
    setRemovedAttachmentIds([]);
  }, [initialData, reset]);

  const validateAttachments = (nextExisting: NoticeAttachment[], nextFiles: File[]) => {
    if (nextExisting.length + nextFiles.length > NOTICE_ATTACHMENT_MAX_FILES) {
      showError('첨부파일 수가 너무 많습니다. 파일 수를 줄여주세요.');
      return false;
    }

    const totalBytes =
      nextExisting.reduce((sum, attachment) => sum + attachment.size, 0) +
      nextFiles.reduce((sum, file) => sum + file.size, 0);

    if (totalBytes > NOTICE_ATTACHMENT_MAX_TOTAL_BYTES) {
      showError(
        `첨부파일 총합은 ${formatBytes(NOTICE_ATTACHMENT_MAX_TOTAL_BYTES)} 이하만 가능합니다.`,
      );
      return false;
    }

    return true;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files || []);
    if (!validateAttachments(keptExistingAttachments, nextFiles)) {
      event.target.value = '';
      return;
    }

    setSelectedFiles(nextFiles);
  };

  const toggleTeam = (teamId: number) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const toggleAttachmentRemoval = (attachment: NoticeAttachment) => {
    const isRemoved = removedAttachmentIds.includes(attachment.id);

    if (isRemoved) {
      const nextExisting = [...keptExistingAttachments, attachment];
      if (!validateAttachments(nextExisting, selectedFiles)) {
        return;
      }

      setRemovedAttachmentIds((prev) => prev.filter((id) => id !== attachment.id));
      return;
    }

    setRemovedAttachmentIds((prev) => [...prev, attachment.id]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleFormSubmit = async (data: NoticeFormData) => {
    await onSubmit({
      ...data,
      targetTeamIds: data.targetType === 'TEAM' ? selectedTeamIds : undefined,
      targetUserIds: data.targetType === 'INDIVIDUAL' ? selectedUserIds : undefined,
      files: selectedFiles,
      removeAttachmentIds: removedAttachmentIds,
    });
  };

  const filteredUsers = users.filter((user) => {
    const query = userSearchQuery.toLowerCase();
    const matchesName = user.name?.toLowerCase().includes(query);
    const matchesTeam = user.instructor?.team?.name?.toLowerCase().includes(query);
    return matchesName || matchesTeam;
  });

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          제목
        </label>
        <input
          type="text"
          id="title"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="공지사항 제목을 입력해 주세요."
          {...register('title', { required: '제목을 입력해 주세요.' })}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          내용
        </label>
        <textarea
          id="content"
          rows={6}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="공지사항 내용을 입력해 주세요."
          {...register('content', { required: '내용을 입력해 주세요.' })}
        />
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <label htmlFor="attachments" className="block text-sm font-medium text-gray-700">
            첨부파일
          </label>
          <span className="text-xs text-gray-500">
            총 {formatBytes(NOTICE_ATTACHMENT_MAX_TOTAL_BYTES)}까지
          </span>
        </div>
        <input
          id="attachments"
          type="file"
          multiple
          accept={NOTICE_ATTACHMENT_ACCEPT}
          onChange={handleFileChange}
          className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="mt-2 text-xs text-gray-500">
          문서와 이미지 파일만 첨부할 수 있으며, 첨부파일 총 용량은 5MB까지 가능합니다.
          상단 고정 중에는 첨부 만료가 유예됩니다.
        </p>

        {(keptExistingAttachments.length > 0 || removedAttachmentIds.length > 0) && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">기존 첨부파일</p>
            {existingAttachments.map((attachment) => {
              const isRemoved = removedAttachmentIds.includes(attachment.id);

              return (
                <div
                  key={attachment.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                    isRemoved ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{attachment.originalName}</p>
                    <p className="text-xs text-gray-500">{formatBytes(attachment.size)}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {!isRemoved && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await noticeApi.downloadAttachment(
                              attachment.id,
                              attachment.originalName,
                            );
                          } catch (error) {
                            showError(
                              error instanceof Error
                                ? error.message
                                : '첨부파일 다운로드에 실패했습니다.',
                            );
                          }
                        }}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        다운로드
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleAttachmentRemoval(attachment)}
                      className={`rounded-md px-2 py-1 text-xs ${
                        isRemoved
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {isRemoved ? '복구' : '삭제'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">새로 첨부할 파일</p>
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between rounded-md border border-indigo-100 bg-white px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSelectedFile(index)}
                  className="ml-3 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                >
                  제거
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between rounded-md bg-white px-3 py-2 text-xs text-gray-500">
          <span>현재 업로드 용량</span>
          <span>
            {formatBytes(totalAttachmentSize)} / {formatBytes(NOTICE_ATTACHMENT_MAX_TOTAL_BYTES)}
          </span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">발송 대상</label>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="ALL"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              {...register('targetType')}
            />
            <span className="text-sm text-gray-700">전체</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="TEAM"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              {...register('targetType')}
            />
            <span className="text-sm text-gray-700">특정 팀</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="INDIVIDUAL"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              {...register('targetType')}
            />
            <span className="text-sm text-gray-700">특정 강사</span>
          </label>
        </div>
      </div>

      {targetType === 'TEAM' && (
        <div className="rounded-md bg-gray-50 p-3">
          <p className="mb-2 text-sm font-medium text-gray-700">
            팀 선택 <span className="text-indigo-600">({selectedTeamIds.length}개)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => toggleTeam(team.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selectedTeamIds.includes(team.id)
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-500'
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
          {selectedTeamIds.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">최소 한 개의 팀을 선택해 주세요.</p>
          )}
        </div>
      )}

      {targetType === 'INDIVIDUAL' && (
        <div className="rounded-md bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              강사 선택 <span className="text-indigo-600">({selectedUserIds.length}명)</span>
            </p>
          </div>
          <input
            type="text"
            placeholder="이름 또는 팀명으로 검색.."
            value={userSearchQuery}
            onChange={(event) => setUserSearchQuery(event.target.value)}
            className="mb-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <p className="py-2 text-sm text-gray-500">검색 결과가 없습니다.</p>
            ) : (
              filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-colors ${
                    selectedUserIds.includes(user.id) ? 'bg-indigo-100' : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{user.name || '이름 없음'}</span>
                  {user.instructor?.team?.name && (
                    <span className="text-xs text-gray-500">({user.instructor.team.name})</span>
                  )}
                </label>
              ))
            )}
          </div>
          {selectedUserIds.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">최소 한 명의 강사를 선택해 주세요.</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPinned"
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          {...register('isPinned')}
        />
        <label htmlFor="isPinned" className="text-sm font-medium text-gray-700">
          상단에 고정
        </label>
      </div>

      {isPinned && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          상단 고정 중에는 첨부파일 만료가 유예되고, 고정 해제 시점부터 다시 만료 기간이 계산됩니다.
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={
            isLoading ||
            (!isEditMode && targetType === 'TEAM' && selectedTeamIds.length === 0) ||
            (!isEditMode && targetType === 'INDIVIDUAL' && selectedUserIds.length === 0)
          }
          className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? '저장 중..' : '저장'}
        </button>
      </div>
    </form>
  );
};
