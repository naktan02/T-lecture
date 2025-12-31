import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyProfile,
  updateMyProfile,
  UpdateProfilePayload,
} from '../../features/user/api/user.me.api';
import { ContentWrapper } from '../../shared/ui';
import { showSuccess, showError } from '../../shared/utils';

const UserProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState<UpdateProfilePayload>({});

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
  });

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      showSuccess('프로필이 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      setIsEditing(false);
    },
    onError: (err: any) => {
      showError(err.message || '프로필 수정에 실패했습니다.');
    },
  });

  const handleEditClick = () => {
    if (user) {
      setFormData({
        name: user.name,
        phoneNumber: user.userphoneNumber || '',
        address: user.instructor?.location || '',
        email: user.userEmail,
        password: '', // 비밀번호는 비워둠
      });
      setIsEditing(true);
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <ContentWrapper title="내 정보">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </ContentWrapper>
    );
  }

  if (error || !user) {
    return (
      <ContentWrapper title="내 정보">
        <div className="text-red-500 text-center py-8">사용자 정보를 불러오는데 실패했습니다.</div>
      </ContentWrapper>
    );
  }

  const isInstructor = !!user.instructor;
  const isAdmin = !!user.admin;

  return (
    <ContentWrapper title="내 정보">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 상단 헤더 카드 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-indigo-600 px-4 py-8 sm:px-6 flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600 border-4 border-indigo-200">
                {user.name.charAt(0)}
              </div>
              <div className="ml-4 text-white">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-indigo-100">{user.userEmail}</p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={handleEditClick}
                className="bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
              >
                정보 수정
              </button>
            )}
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 좌측: 기본 정보 & 상태 */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                계정 상태
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">상태</label>
                  <span
                    className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      user.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : user.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.status === 'APPROVED'
                      ? '승인됨 (활동중)'
                      : user.status === 'PENDING'
                        ? '승인 대기'
                        : user.status}
                  </span>
                </div>
                {isAdmin && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">관리자 권한</label>
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                      {user.admin?.level === 'SUPER' ? '슈퍼 관리자' : '일반 관리자'}
                    </span>
                  </div>
                )}
                {isInstructor && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">강사 유형</label>
                    <span className="text-sm font-medium text-gray-800">
                      {user.instructor?.category || '미지정'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 우측: 상세 정보 (수정 폼 포함) */}
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex justify-between items-center">
                <span>상세 정보</span>
                {isEditing && (
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={handleCancelClick}
                      className="text-gray-500 hover:text-gray-700 text-sm font-medium px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-1.5 rounded shadow-sm transition-colors disabled:opacity-50"
                    >
                      {updateMutation.isPending ? '저장 중...' : '저장'}
                    </button>
                  </div>
                )}
              </h3>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">이름</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">{user.name}</div>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">전화번호</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="phoneNumber"
                      value={formData.phoneNumber || ''}
                      onChange={handleInputChange}
                      placeholder="010-0000-0000"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">{user.userphoneNumber || '-'}</div>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">이메일</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-500">{user.userEmail}</div>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">새 비밀번호</label>
                  {isEditing ? (
                    <input
                      type="password"
                      name="password"
                      placeholder="변경시에만 입력해주세요"
                      value={formData.password || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-gray-400">********</div>
                  )}
                </div>

                {/* 강사 전용 필드 */}
                {isInstructor && (
                  <>
                    <div className="sm:col-span-full border-t border-gray-100 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">강사 활동 정보</h4>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">
                        활동 지역 (주소)
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="address"
                          value={formData.address || ''}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {user.instructor?.location || '-'}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">소속팀</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {user.instructor?.team?.name || '배정되지 않음'}
                        {user.instructor?.isTeamLeader && (
                          <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                            팀장
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">기수</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {user.instructor?.generation ? `${user.instructor.generation}기` : '-'}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">제한 지역</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {user.instructor?.restrictedArea || '없음'}
                      </div>
                    </div>

                    <div className="sm:col-span-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        강의 가능 과목(덕목)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {user.instructor?.virtues && user.instructor.virtues.length > 0 ? (
                          user.instructor.virtues.map((v) => (
                            <span
                              key={v.virtue.id}
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {v.virtue.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </form>

            {/* 통계 섹션 (강사만) */}
            {isInstructor && user.instructor?.instructorStats && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                  활동 통계
                </h3>
                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">기존 실습 횟수</dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {user.instructor.instructorStats[0]?.legacyPracticumCount || 0}
                    </dd>
                  </div>
                  <div className="px-4 py-5 bg-gray-50 shadow rounded-lg overflow-hidden sm:p-6">
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      자동 승급 대상 여부
                    </dt>
                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                      {user.instructor.instructorStats[0]?.autoPromotionEnabled ? '대상' : '비대상'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </ContentWrapper>
  );
};

export default UserProfilePage;
