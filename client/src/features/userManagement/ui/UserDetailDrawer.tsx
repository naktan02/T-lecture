// client/src/features/userManagement/ui/UserDetailDrawer.tsx
import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, InputField } from '../../../shared/ui';
import { userManagementApi, User, UpdateUserDto } from '../api/userManagementApi';

interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (params: { id: number; data: UpdateUserDto }) => void;
  onDelete: (id: number) => void;
  onApprove?: (id: number) => Promise<void>;
  onReject?: (id: number) => Promise<void>;
}

interface FormData {
  name: string;
  phoneNumber: string;
  status: string;
  address: string;
  // 강사 관리자 직접 관리 필드
  category: string;
  teamId: string;
  generation: string;
  isTeamLeader: boolean;
  restrictedArea: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  phoneNumber: '',
  status: 'APPROVED',
  address: '',
  category: '',
  teamId: '',
  generation: '',
  isTeamLeader: false,
  restrictedArea: '',
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
  { value: 'Assistant', label: '조교' },
  { value: 'Practicum', label: '실습' },
];

export const UserDetailDrawer = ({
  isOpen,
  onClose,
  user: initialUser,
  onUpdate,
  onDelete,
  onApprove,
  onReject,
}: UserDetailDrawerProps) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'instructor' | 'admin'>('basic');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);

  const userId = initialUser?.id;

  // 상세 데이터 조회
  const { data: detailUser } = useQuery({
    queryKey: ['adminUserDetail', userId],
    queryFn: () => userManagementApi.getUser(userId as number),
    enabled: Boolean(userId) && isOpen,
    staleTime: 0,
  });

  // 바인딩 대상 유저
  const boundUser = detailUser ?? initialUser;

  // 폼 데이터 바인딩
  useEffect(() => {
    if (!isOpen) return;

    if (!initialUser) {
      setFormData({ ...INITIAL_FORM });
      setActiveTab('basic');
      return;
    }

    const target = boundUser ?? initialUser;

    setFormData({
      name: target.name || '',
      phoneNumber: target.userphoneNumber || '',
      status: target.status || 'APPROVED',
      address: target.instructor?.location || '',
      category: target.instructor?.category || '',
      teamId: target.instructor?.teamId?.toString() || '',
      generation: target.instructor?.generation?.toString() || '',
      isTeamLeader: target.instructor?.isTeamLeader || false,
      restrictedArea: target.instructor?.restrictedArea || '',
    });

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

    // 강사 정보
    if (boundUser?.instructor) {
      if (formData.address !== (boundUser.instructor.location || '')) {
        updateData.address = formData.address;
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
    }

    if (Object.keys(updateData).length === 0) {
      alert('변경된 내용이 없습니다.');
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

  if (!isOpen) return null;

  const isInstructor = !!boundUser?.instructor;
  const isAdmin = !!boundUser?.admin;
  const isPending = boundUser?.status === 'PENDING';

  const tabs: { key: 'basic' | 'instructor' | 'admin'; label: string; show: boolean }[] = [
    { key: 'basic', label: '기본 정보', show: true },
    { key: 'instructor', label: '강사 정보', show: isInstructor },
    { key: 'admin', label: '관리자 정보', show: isAdmin },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 z-50 w-full md:w-[600px] bg-white shadow-2xl flex flex-col">
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
              {initialUser ? '유저 정보' : '유저 상세'}
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
                className={`flex-1 min-w-[100px] py-3 px-4 font-medium text-sm md:text-base border-b-2 whitespace-nowrap transition-colors ${
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
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">👤 기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
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
                      onChange={handleChange}
                    />
                    <div className="col-span-2">
                      <label className="text-sm font-medium">이메일</label>
                      <input
                        type="text"
                        value={boundUser?.userEmail || '-'}
                        disabled
                        className="w-full mt-1 p-2 border rounded-lg bg-gray-100 text-gray-500"
                      />
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
              </div>
            )}

            {activeTab === 'instructor' && isInstructor && (
              <div className="space-y-6">
                {/* 일반 강사 정보 */}
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">📍 강사 기본 정보</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">주소</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">위도</label>
                        <input
                          type="text"
                          value={boundUser?.instructor?.lat ?? '-'}
                          disabled
                          className="w-full mt-1 p-2 border rounded-lg bg-gray-100 text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">경도</label>
                        <input
                          type="text"
                          value={boundUser?.instructor?.lng ?? '-'}
                          disabled
                          className="w-full mt-1 p-2 border rounded-lg bg-gray-100 text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* 관리자 직접 관리 섹션 */}
                <section className="bg-blue-50 p-5 rounded-xl border border-blue-200 shadow-sm">
                  <h3 className="font-bold mb-4 text-blue-800">🔧 관리자 직접 관리 필드</h3>
                  <p className="text-xs text-blue-600 mb-4">
                    아래 필드들은 관리자만 수정할 수 있습니다.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
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
                      <label className="text-sm font-medium">팀 ID</label>
                      <input
                        type="number"
                        name="teamId"
                        value={formData.teamId}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg"
                        placeholder="팀 ID 입력"
                      />
                      {boundUser?.instructor?.team && (
                        <p className="text-xs text-gray-500 mt-1">
                          현재: {boundUser.instructor.team.name}
                        </p>
                      )}
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
                  </div>
                </section>

                {/* 강의 가능 덕목 */}
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">📚 강의 가능 덕목</h3>
                  {boundUser?.instructor?.virtues && boundUser.instructor.virtues.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {boundUser.instructor.virtues.map((v) => (
                        <span
                          key={v.virtueId}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                        >
                          {v.virtue?.name || `덕목 ${v.virtueId}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">등록된 덕목이 없습니다.</p>
                  )}
                </section>

                {/* 근무 가능일 */}
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">📅 근무 가능일</h3>
                  {boundUser?.instructor?.availabilities &&
                  boundUser.instructor.availabilities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {boundUser.instructor.availabilities.slice(0, 10).map((a) => (
                        <span
                          key={a.id}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {new Date(a.availableOn).toLocaleDateString('ko-KR')}
                        </span>
                      ))}
                      {boundUser.instructor.availabilities.length > 10 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                          + {boundUser.instructor.availabilities.length - 10}개 더
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">등록된 근무 가능일이 없습니다.</p>
                  )}
                </section>

                {/* 강사 통계 */}
                {boundUser?.instructor?.instructorStats &&
                  boundUser.instructor.instructorStats.length > 0 && (
                    <section className="bg-white p-5 rounded-xl border shadow-sm">
                      <h3 className="font-bold mb-4">📊 강사 통계</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">레거시 실습 횟수</label>
                          <p className="font-semibold">
                            {boundUser.instructor.instructorStats[0]?.legacyPracticumCount ?? 0}회
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">자동 승급 활성화</label>
                          <p className="font-semibold">
                            {boundUser.instructor.instructorStats[0]?.autoPromotionEnabled
                              ? '예'
                              : '아니오'}
                          </p>
                        </div>
                      </div>
                    </section>
                  )}
              </div>
            )}

            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6">
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">🛡️ 관리자 정보</h3>
                  <div>
                    <label className="text-sm font-medium">관리자 레벨</label>
                    <input
                      type="text"
                      value={boundUser?.admin?.level === 'SUPER' ? '슈퍼 관리자' : '일반 관리자'}
                      disabled
                      className="w-full mt-1 p-2 border rounded-lg bg-gray-100 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      관리자 권한은 슈퍼 관리자 페이지에서 변경할 수 있습니다.
                    </p>
                  </div>
                </section>
              </div>
            )}
          </form>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t bg-white flex justify-between shrink-0">
          {initialUser && (
            <button
              type="button"
              onClick={() => onDelete(initialUser.id)}
              className="text-red-500 hover:text-red-700"
            >
              삭제
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            {isPending && onApprove && onReject && (
              <>
                <Button variant="danger" onClick={handleReject}>
                  거절
                </Button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="px-5 py-2 bg-amber-500 text-white rounded font-medium hover:bg-amber-600"
                >
                  승인
                </button>
              </>
            )}
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <button
              type="submit"
              form="user-form"
              className="px-5 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
