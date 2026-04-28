// client/src/features/userManagement/ui/UserDetailDrawer.tsx
import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStoredCurrentUser } from '../../../shared/auth/session';
import { AddressSearchInput, Button, InputField } from '../../../shared/ui';
import { showWarning, showSuccess, showError } from '../../../shared/utils/toast';
import { userManagementApi, User, UpdateUserDto } from '../api/userManagementApi';
import { getTeams, getVirtues, Team, Virtue } from '../../settings/settingsApi';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { formatPhoneNumber } from '../../../shared/utils';

interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (params: { id: number; data: UpdateUserDto }) => void;
  onApprove?: (id: number) => Promise<void>;
  onReject?: (id: number) => Promise<void>;
}

interface FormData {
  name: string;
  phoneNumber: string;
  status: string;
  // 강사 기본 정보
  address: string;
  locationDetail: string;
  lat: string;
  lng: string;
  // 강사 관리 필드
  category: string;
  teamId: string;
  generation: string;
  isTeamLeader: boolean;
  restrictedArea: string;
  profileCompleted: boolean;
  // 강사 통계
  legacyPracticumCount: string;
  autoPromotionEnabled: boolean;
}

const INITIAL_FORM: FormData = {
  name: '',
  phoneNumber: '',
  status: 'APPROVED',
  address: '',
  locationDetail: '',
  lat: '',
  lng: '',
  category: '',
  teamId: '',
  generation: '',
  isTeamLeader: false,
  restrictedArea: '',
  profileCompleted: false,
  legacyPracticumCount: '0',
  autoPromotionEnabled: true,
};

const STATUS_OPTIONS = [
  { value: 'PENDING', label: '승인 대기' },
  { value: 'APPROVED', label: '활동중' },
  { value: 'RESTING', label: '휴식중' },
  { value: 'INACTIVE', label: '비활성' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: '미지정' },
  { value: 'Main', label: '주강사' },
  { value: 'Co', label: '보조강사' },
  { value: 'Assistant', label: '부강사' },
  { value: 'Practicum', label: '실습' },
];

// 팀과 덕목은 API에서 동적으로 로드

const getMonthKeyFromDateString = (dateStr: string) => dateStr.slice(0, 7);

const buildAvailabilityMonthUpdates = (dates: string[], changedMonths: Set<string>) =>
  Array.from(changedMonths).map((key) => {
    const [year, month] = key.split('-').map(Number);
    return {
      year,
      month,
      dates: dates
        .filter((dateStr) => getMonthKeyFromDateString(dateStr) === key)
        .map((dateStr) => Number(dateStr.slice(8, 10)))
        .sort((a, b) => a - b),
    };
  });

type TabKey = 'basic' | 'instructor' | 'availability' | 'admin';

export const UserDetailDrawer = ({
  isOpen,
  onClose,
  user: initialUser,
  onUpdate,
  onApprove,
  onReject,
}: UserDetailDrawerProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [selectedVirtues, setSelectedVirtues] = useState<number[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [changedAvailabilityMonths, setChangedAvailabilityMonths] = useState<Set<string>>(
    () => new Set(),
  );
  const [originalAddress, setOriginalAddress] = useState<string>(''); // 원본 주소 저장

  const userId = initialUser?.id;

  // 현재 로그인한 사용자 ID 가져오기 (같은 관리자인지 체크용)
  const getCurrentUserId = (): number | null => getStoredCurrentUser<{ id?: number }>()?.id ?? null;
  const currentUserId = getCurrentUserId();

  // 같은 관리자인지 확인 (둘 다 admin이고 같은 ID)
  const isSameAdmin = Boolean(
    initialUser?.admin && currentUserId && initialUser.id === currentUserId,
  );

  // 상세 데이터 조회
  const { data: detailUser } = useQuery({
    queryKey: ['adminUserDetail', userId],
    queryFn: () => userManagementApi.getUser(userId as number),
    enabled: Boolean(userId) && isOpen,
    staleTime: 0,
  });

  // 팀 목록 조회
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 덕목 목록 조회
  const { data: virtues = [] } = useQuery<Virtue[]>({
    queryKey: ['virtues'],
    queryFn: getVirtues,
    staleTime: 5 * 60 * 1000, // 5분
  });

  // 바인딩 대상 유저
  const boundUser = detailUser ?? initialUser;

  // 폼 데이터 바인딩
  useEffect(() => {
    if (!isOpen) return;

    if (!initialUser) {
      setFormData({ ...INITIAL_FORM });
      setFormData({ ...INITIAL_FORM });
      setSelectedVirtues([]);
      setAvailableDates([]);
      setChangedAvailabilityMonths(new Set());
      setActiveTab('basic');
      return;
    }

    const target = boundUser ?? initialUser;

    const addressValue = target.instructor?.location || '';
    const detailAddressValue = target.instructor?.locationDetail || '';
    setFormData({
      name: target.name || '',
      phoneNumber: target.userphoneNumber || '',
      status: target.status || 'APPROVED',
      address: addressValue,
      locationDetail: detailAddressValue,
      lat: target.instructor?.lat?.toString() || '',
      lng: target.instructor?.lng?.toString() || '',
      category: target.instructor?.category || '',
      teamId: target.instructor?.teamId?.toString() || '',
      generation: target.instructor?.generation?.toString() || '',
      isTeamLeader: target.instructor?.isTeamLeader || false,
      restrictedArea: target.instructor?.restrictedArea || '',
      profileCompleted: target.instructor?.profileCompleted || false,
      legacyPracticumCount:
        target.instructor?.instructorStats?.[0]?.legacyPracticumCount?.toString() || '0',
      autoPromotionEnabled: target.instructor?.instructorStats?.[0]?.autoPromotionEnabled ?? true,
    });
    setOriginalAddress(addressValue); // 원본 주소 저장

    // 덕목 설정
    const virtueIds = target.instructor?.virtues?.map((v) => v.virtueId) || [];
    setSelectedVirtues(virtueIds);

    // 가용일 설정
    const dates =
      target.instructor?.availabilities?.map(
        (a) => new Date(a.availableOn).toISOString().split('T')[0],
      ) || [];
    setAvailableDates(dates);
    setChangedAvailabilityMonths(new Set());

    setActiveTab('basic');
  }, [isOpen, initialUser, boundUser]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePhoneNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({ ...prev, phoneNumber: formatted }));
  };

  const handleVirtueToggle = (virtueId: number) => {
    setSelectedVirtues((prev) =>
      prev.includes(virtueId) ? prev.filter((id) => id !== virtueId) : [...prev, virtueId],
    );
  };

  const handleAvailabilityChange = (nextDates: string[], changedDate: string) => {
    setAvailableDates(nextDates);
    setChangedAvailabilityMonths((prev) => {
      const next = new Set(prev);
      next.add(getMonthKeyFromDateString(changedDate));
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!initialUser) return;

    const updateData: UpdateUserDto = {};

    // 기본 정보
    if (formData.name !== (boundUser?.name || '')) {
      updateData.name = formData.name;
    }
    if (formData.phoneNumber !== (boundUser?.userphoneNumber || '')) {
      updateData.phoneNumber = formData.phoneNumber;
    }
    if (formData.status !== boundUser?.status) {
      updateData.status = formData.status;
    }

    // 강사 정보 (주소는 별도 저장이므로 제외)
    // 단, 상세 주소는 별도 저장이 가능하도록 폼 데이터에 추가할 수 있습니다.
    // 기존 updateUser API가 locationDetail을 받는지 확인이 필요하지만,
    // userManagementApi.updateUser() DTO에 locationDetail이 있다고 가정합니다.
    if (boundUser?.instructor) {
      if (formData.locationDetail !== (boundUser.instructor.locationDetail || '')) {
        updateData.locationDetail = formData.locationDetail;
      }
      if (formData.category !== (boundUser.instructor.category || '')) {
        updateData.category = formData.category as UpdateUserDto['category'];
      }
      const newTeamId = formData.teamId ? parseInt(formData.teamId, 10) : null;
      if (newTeamId !== (boundUser.instructor.teamId || null)) {
        updateData.teamId = newTeamId;
      }
      const newGeneration = formData.generation ? parseInt(formData.generation, 10) : null;
      if (newGeneration !== (boundUser.instructor.generation || null)) {
        updateData.generation = newGeneration;
      }
      if (formData.isTeamLeader !== boundUser.instructor.isTeamLeader) {
        updateData.isTeamLeader = formData.isTeamLeader;
      }
      if (formData.restrictedArea !== (boundUser.instructor.restrictedArea || '')) {
        updateData.restrictedArea = formData.restrictedArea || null;
      }
      // profileCompleted는 백엔드에서 자동 계산되므로 제외

      if (changedAvailabilityMonths.size > 0) {
        updateData.availabilityMonths = buildAvailabilityMonthUpdates(
          availableDates,
          changedAvailabilityMonths,
        );
      }

      const originalVirtueIds = (boundUser.instructor.virtues || [])
        .map((virtue) => virtue.virtueId)
        .sort((a, b) => a - b);
      const nextVirtueIds = [...selectedVirtues].sort((a, b) => a - b);
      const isVirtuesChanged =
        originalVirtueIds.length !== nextVirtueIds.length ||
        originalVirtueIds.some((virtueId, index) => virtueId !== nextVirtueIds[index]);

      if (isVirtuesChanged) {
        updateData.virtueIds = nextVirtueIds;
      }
    }

    if (Object.keys(updateData).length === 0) {
      showWarning('변경된 내용이 없습니다.');
      return;
    }

    onUpdate({ id: initialUser.id, data: updateData });
    onClose();
  };

  const handleApprove = async () => {
    if (initialUser && onApprove) {
      await onApprove(initialUser.id);
      onClose();
    }
  };

  const handleReject = async () => {
    if (initialUser && onReject) {
      await onReject(initialUser.id);
      onClose();
    }
  };

  // 주소 별도 저장 핸들러
  const handleSaveAddress = async () => {
    if (!initialUser) return;

    // 주소가 변경되지 않았으면 스킵
    if (formData.address === originalAddress) {
      showWarning('주소가 변경되지 않았습니다.');
      return;
    }

    try {
      await userManagementApi.updateUserAddress(initialUser.id, formData.address);
      setOriginalAddress(formData.address); // 원본 주소 업데이트
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminUserDetail'] });
      showSuccess('주소가 저장되었습니다. 좌표가 자동으로 계산됩니다.');
    } catch (err) {
      showError((err as Error).message || '주소 저장 중 오류가 발생했습니다.');
    }
  };

  // 주소 변경 여부
  const isAddressChanged = formData.address !== originalAddress;

  if (!isOpen) return null;

  const isInstructor = !!boundUser?.instructor;
  const isAdmin = !!boundUser?.admin;
  const isPending = boundUser?.status === 'PENDING';

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: 'basic', label: '기본 정보', show: true },
    { key: 'instructor', label: '강사 정보', show: isInstructor },
    { key: 'availability', label: '근무 가능일', show: isInstructor },
    { key: 'admin', label: '관리자 정보', show: isAdmin },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 z-50 w-full md:w-[650px] bg-white shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-lg md:text-xl font-bold">
              {initialUser ? '유저 정보 관리' : '유저 상세'}
            </h2>
            {isPending && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                승인 대기
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="hidden md:flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b bg-gray-50 shrink-0 overflow-x-auto">
          {tabs
            .filter((t) => t.show)
            .map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[80px] py-3 px-3 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
            {/* ===== 기본 정보 탭 ===== */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <section className="bg-white p-4 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    👤 기본 정보
                    <span className="text-xs text-gray-400 font-normal">ID: {boundUser?.id}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="이름"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                    <InputField
                      label="연락처"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handlePhoneNumberChange}
                    />
                    <div className="col-span-2">
                      <label className="text-sm font-medium">이메일</label>
                      <input
                        type="text"
                        value={boundUser?.userEmail || '-'}
                        disabled
                        className="w-full mt-1 p-2 border rounded-lg bg-gray-100 text-gray-500 text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다.</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">상태</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* 유저 유형 표시 */}
                <section className="bg-white p-4 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-3">🏷️ 유저 유형</h3>
                  <div className="flex flex-wrap gap-2">
                    {isInstructor && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        강사
                      </span>
                    )}
                    {isAdmin && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {boundUser?.admin?.level === 'SUPER' ? '슈퍼 관리자' : '관리자'}
                      </span>
                    )}
                    {!isInstructor && !isAdmin && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                        일반 유저
                      </span>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* ===== 강사 정보 탭 ===== */}
            {activeTab === 'instructor' && isInstructor && (
              <div className="space-y-4">
                {/* 강사 기본 정보 */}
                <section className="bg-white p-4 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">📍 위치 정보</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">주소</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <AddressSearchInput
                          value={formData.address}
                          onChange={(value) => setFormData((prev) => ({ ...prev, address: value }))}
                          className="mt-1 flex-1 min-w-0"
                          inputClassName="rounded-lg border p-2 text-sm bg-gray-50"
                          buttonClassName="bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap"
                          buttonLabel="검색"
                        />
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleSaveAddress}
                            disabled={!isAddressChanged}
                            className={`sm:mt-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                              isAddressChanged
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            저장
                          </button>
                        </div>
                      </div>
                      {isAddressChanged && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ 주소가 변경되었습니다. [저장]을 눌러 저장하세요.
                        </p>
                      )}
                    </div>
                    {/* 상세 주소 입력 필드 추가 */}
                    <div className="mt-2 text-sm">
                      <label className="text-sm font-medium">상세 주소</label>
                      <input
                        type="text"
                        name="locationDetail"
                        value={formData.locationDetail}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg"
                        placeholder="아파트, 동/호수 등 상세 주소 입력"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        * 상세 주소를 수정한 후 하단의 [저장] 버튼을 눌러야 반영됩니다.
                      </p>
                    </div>
                  </div>
                </section>

                {/* 강사 조직 정보 */}
                <section className="bg-white p-4 rounded-xl border shadow-sm overflow-hidden">
                  <h3 className="font-bold mb-4">🏢 조직 정보</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">분류</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">기수</label>
                      <input
                        type="number"
                        name="generation"
                        value={formData.generation}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg"
                        placeholder="예: 12"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">소속 팀</label>
                      <select
                        name="teamId"
                        value={formData.teamId}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg"
                      >
                        <option value="">무소속</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id.toString()}>
                            {team.name || `팀 ${team.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="isTeamLeader"
                        name="isTeamLeader"
                        checked={formData.isTeamLeader}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <label htmlFor="isTeamLeader" className="text-sm font-medium">
                        팀장 여부
                      </label>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">제한 지역</label>
                      <textarea
                        name="restrictedArea"
                        value={formData.restrictedArea}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg"
                        rows={2}
                        placeholder="배정 제한 지역 입력"
                      />
                    </div>
                    <div className="col-span-2 mt-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">프로필 상태</span>
                          {boundUser?.instructor?.profileCompleted ? (
                            <span className="px-2 py-0.5 text-xs font-bold text-green-700 bg-green-100 rounded-full border border-green-200">
                              완료됨
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-100 rounded-full border border-amber-200">
                              미완료
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          * 필수 정보가 입력되면 자동 완료
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 강의 가능 덕목 */}
                <section className="bg-white p-4 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-3">📚 강의 가능 덕목</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    강사가 강의할 수 있는 덕목을 선택하세요.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {virtues.length > 0 ? (
                      virtues.map((virtue) => (
                        <button
                          key={virtue.id}
                          type="button"
                          onClick={() => handleVirtueToggle(virtue.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selectedVirtues.includes(virtue.id)
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {virtue.name || `덕목 ${virtue.id}`}
                        </button>
                      ))
                    ) : (
                      <p className="text-gray-400 text-sm">
                        등록된 덕목이 없습니다. 시스템 설정에서 덕목을 추가해주세요.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* ===== 근무 가능일 탭 ===== */}
            {activeTab === 'availability' && isInstructor && (
              <div className="space-y-4">
                <section className="bg-white p-4 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-3">📅 근무 가능일 관리</h3>
                  <p className="text-sm text-gray-600 mb-4 ml-1">
                    캘린더에서 근무 가능한 날짜를 선택해주세요.{' '}
                    <span className="text-blue-500 font-medium">
                      (선택된 날짜 {availableDates.length}일)
                    </span>
                  </p>

                  <AvailabilityCalendar
                    availableDates={availableDates}
                    onDateChange={handleAvailabilityChange}
                  />
                </section>

                <section className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <h3 className="font-bold mb-2 text-blue-800">💡 안내</h3>
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    <li>날짜를 클릭하면 선택/해제됩니다.</li>
                    <li>
                      변경 후 반드시 하단의 <strong>[저장]</strong> 버튼을 눌러야 반영됩니다.
                    </li>
                  </ul>
                </section>
              </div>
            )}

            {/* ===== 관리자 정보 탭 ===== */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-4">
                <section className="bg-white p-4 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">🛡️ 관리자 정보</h3>
                  <div>
                    <label className="text-sm font-medium">관리자 레벨</label>
                    <div className="mt-2 flex items-center gap-3">
                      <span
                        className={`px-4 py-2 rounded-lg font-medium ${
                          boundUser?.admin?.level === 'SUPER'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {boundUser?.admin?.level === 'SUPER' ? '🔥 슈퍼 관리자' : '👤 일반 관리자'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      관리자 권한 변경은 슈퍼 관리자 페이지 (/admin/super)에서 할 수 있습니다.
                    </p>
                  </div>
                </section>
              </div>
            )}
          </form>
        </div>

        {/* 푸터 */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t bg-white flex justify-end shrink-0">
          <div className="flex gap-2">
            {isPending && onApprove && onReject && (
              <>
                <Button variant="danger" onClick={handleReject}>
                  거절
                </Button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="px-4 py-2 bg-amber-500 text-white rounded font-medium hover:bg-amber-600 text-sm"
                >
                  승인
                </button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            {/* 저장 버튼: 같은 관리자면 숨김 */}
            {!isSameAdmin && (
              <button
                type="submit"
                form="user-form"
                className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 text-sm"
              >
                저장
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
