import { ReactElement, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getTeams, Team } from '../../settings/settingsApi';
import { userManagementApi, User } from '../../userManagement/api/userManagementApi';

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
  onSubmit: (data: NoticeFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel: () => void;
  isEditMode?: boolean; // 수정 모드일 때 발송 대상 숨김
}

export const NoticeForm = ({
  initialData,
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

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<NoticeFormData>({
    defaultValues: initialData || { title: '', content: '', isPinned: false, targetType: 'ALL' },
  });

  const targetType = watch('targetType');

  // 팀 목록 로드
  useEffect(() => {
    getTeams().then(setTeams).catch(console.error);
  }, []);

  // 사용자 목록 로드 (INDIVIDUAL 선택 시)
  useEffect(() => {
    if (targetType === 'INDIVIDUAL') {
      userManagementApi
        .getUsers({ status: 'APPROVED', limit: 100 })
        .then((res) => setUsers(res.data))
        .catch(console.error);
    }
  }, [targetType]);

  // 초기 데이터 설정 (수정 모드 시)
  useEffect(() => {
    if (initialData) {
      reset(initialData);
      if (initialData.targetTeamIds) {
        setSelectedTeamIds(initialData.targetTeamIds);
      }
      if (initialData.targetUserIds) {
        setSelectedUserIds(initialData.targetUserIds);
      }
    }
  }, [initialData, reset]);

  const handleFormSubmit = (data: NoticeFormData) => {
    onSubmit({
      ...data,
      targetTeamIds: data.targetType === 'TEAM' ? selectedTeamIds : undefined,
      targetUserIds: data.targetType === 'INDIVIDUAL' ? selectedUserIds : undefined,
    });
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

  // 사용자 검색 필터링 (이름 또는 팀으로 검색)
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          placeholder="공지사항 제목을 입력하세요"
          {...register('title', { required: '제목을 입력해주세요.' })}
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          placeholder="공지사항 내용을 입력하세요"
          {...register('content', { required: '내용을 입력해주세요.' })}
        />
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
      </div>

      {/* 대상 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">발송 대상</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="ALL"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              {...register('targetType')}
            />
            <span className="text-sm text-gray-700">전체</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="TEAM"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              {...register('targetType')}
            />
            <span className="text-sm text-gray-700">특정 팀</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="INDIVIDUAL"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              {...register('targetType')}
            />
            <span className="text-sm text-gray-700">특정 개인</span>
          </label>
        </div>
      </div>

      {/* 팀 선택 (TEAM일 때만) */}
      {targetType === 'TEAM' && (
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm font-medium text-gray-700 mb-2">
            팀 선택 <span className="text-indigo-600">({selectedTeamIds.length}개)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => toggleTeam(team.id)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  selectedTeamIds.includes(team.id)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500'
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
          {selectedTeamIds.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">⚠️ 팀을 선택해주세요</p>
          )}
        </div>
      )}

      {/* 개인 선택 (INDIVIDUAL일 때) */}
      {targetType === 'INDIVIDUAL' && (
        <div className="bg-gray-50 p-3 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              사용자 선택 <span className="text-indigo-600">({selectedUserIds.length}명)</span>
            </p>
          </div>
          {/* 검색창 */}
          <input
            type="text"
            placeholder="이름 또는 팀으로 검색..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="w-full mb-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
          {/* 사용자 목록 */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">검색 결과가 없습니다.</p>
            ) : (
              filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    selectedUserIds.includes(user.id) ? 'bg-indigo-100' : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="h-4 w-4 text-indigo-600 rounded"
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
            <p className="text-xs text-amber-600 mt-2">⚠️ 사용자를 선택해주세요</p>
          )}
        </div>
      )}

      {/* 상단 고정 옵션 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPinned"
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          {...register('isPinned')}
        />
        <label htmlFor="isPinned" className="text-sm font-medium text-gray-700">
          📌 상단에 고정
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
};
