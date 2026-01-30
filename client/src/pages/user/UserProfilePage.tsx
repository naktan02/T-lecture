import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyProfile,
  updateMyProfile,
  updateMyAddress,
  UpdateProfilePayload,
} from '../../features/user/api/user.me.api';
import { ContentWrapper } from '../../shared/ui';
import { showSuccess, showError, showWarning } from '../../shared/utils';
import {
  sendVerificationCode,
  verifyEmailCode,
  getInstructorMeta,
} from '../../features/auth/authApi';
import { useAuthGuard } from '../../features/auth/model/useAuthGuard';

// Daum Postcode 타입 정의 (간략)
declare global {
  interface Window {
    daum: any;
  }
}

const UserProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const { shouldRender } = useAuthGuard('USER'); // 현재 로그인 유저 정보 (role 등 확인용)

  // 폼 상태
  const [formData, setFormData] = useState<UpdateProfilePayload>({});

  // 비밀번호 확인용 상태
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  // 이메일 인증 관련 상태
  const [emailCode, setEmailCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailVerificationMsg, setEmailVerificationMsg] = useState('');

  // 주소 분리 저장 관련 상태
  const [originalAddress, setOriginalAddress] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // 메타데이터 상태 (덕목 목록)
  const [virtueOptions, setVirtueOptions] = useState<{ id: number; name: string }[]>([]);

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
  });

  // 메타데이터 로드
  useEffect(() => {
    if (user?.instructor) {
      getInstructorMeta().then((meta) => {
        // null safe mapping
        const options = meta.virtues.map((v) => ({
          id: v.id,
          name: v.name || '이름 없음',
        }));
        setVirtueOptions(options);
      });
    }
  }, [user]);

  // 프로필 미완성 감지 및 자동 편집 모드 활성화 (최초 1회만)
  const autoEditTriggered = React.useRef(false);
  useEffect(() => {
    // 강사인데 주소가 없거나 덕목이 없으면 프로필 미완성
    const hasLocation = !!user?.instructor?.location;
    const hasVirtues = (user?.instructor?.virtues?.length ?? 0) > 0;
    if (user?.instructor && (!hasLocation || !hasVirtues)) {
      setIsProfileIncomplete(true);
      // 자동으로 편집 모드 활성화 (최초 1회만)
      if (!autoEditTriggered.current) {
        autoEditTriggered.current = true;
        setFormData({
          name: user.name,
          phoneNumber: user.userphoneNumber || '',
          address: user.instructor?.location || '',
          email: user.userEmail,
          password: '',
          restrictedArea: user.instructor?.restrictedArea || '',
          hasCar: user.instructor?.hasCar || false,
          virtueIds: user.instructor?.virtues?.map((v) => v.virtue.id) || [],
        });
        setOriginalAddress(user.instructor?.location || '');
        setIsEditing(true);
      }
    } else {
      setIsProfileIncomplete(false);
    }
  }, [user]);

  // Daum Postcode 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      showSuccess('프로필이 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      setIsEditing(false);
      // 상태 초기화
      setPasswordConfirm('');
      setPasswordMismatch(false);
      setEmailCode('');
      setIsEmailVerified(false);
      setEmailVerificationMsg('');
      // 프로필 완성 상태 업데이트 (강사인 경우)
      if (isProfileIncomplete) {
        localStorage.setItem('instructorProfileCompleted', 'true');
        setIsProfileIncomplete(false);
        showSuccess('강사 프로필이 완성되었습니다!');
      }
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
        password: '',
        restrictedArea: user.instructor?.restrictedArea || '',
        hasCar: user.instructor?.hasCar || false,
        virtueIds: user.instructor?.virtues?.map((v) => v.virtue.id) || [],
      });
      setOriginalAddress(user.instructor?.location || ''); // 원본 주소 저장
      setIsEditing(true);
      // 초기화
      setPasswordConfirm('');
      setIsEmailVerified(false);
      setEmailVerificationMsg('');
      if (user.userEmail) {
        // 기존 이메일은 이미 인증된 상태로 간주하지만, 수정 시 다시 인증해야 함
        // 여기서는 "변경 시에만 인증" 로직을 따름
      }
    }
  };

  const handleCancelClick = () => {
    // 프로필 미완성 상태에서는 취소 버튼 비활성화 (강제 입력)
    if (isProfileIncomplete) {
      showWarning('강사 프로필을 먼저 완성해주세요.');
      return;
    }
    setIsEditing(false);
    setPasswordConfirm('');
    setEmailCode('');
    setEmailVerificationMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (formData.password && formData.password !== passwordConfirm) {
      showWarning('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 이메일 변경 시 인증 확인
    if (formData.email !== user?.userEmail && !isEmailVerified) {
      showWarning('이메일 변경 시 인증이 필요합니다.');
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setPasswordMismatch(value !== passwordConfirm);
    }
  };

  const handlePasswordConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPasswordConfirm(value);
    setPasswordMismatch(formData.password !== value);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // 덕목 멀티 셀렉트 핸들러
  const handleVirtueToggle = (virtueId: number) => {
    setFormData((prev) => {
      const currentIds = prev.virtueIds || [];
      const exists = currentIds.includes(virtueId);
      const newIds = exists
        ? currentIds.filter((id) => id !== virtueId)
        : [...currentIds, virtueId];
      return { ...prev, virtueIds: newIds };
    });
  };

  // 주소 검색 핸들러
  const handleAddressSearch = () => {
    if (window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: function (data: any) {
          // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분.
          // 예제를 참고하여 다양한 주소 조합을 적용할 수 있습니다.
          const fullAddress = data.address; // 기본 주소
          setFormData((prev) => ({ ...prev, address: fullAddress }));
        },
      }).open();
    } else {
      showWarning('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 주소 분리 저장 핸들러
  const handleSaveAddress = async () => {
    if (!formData.address) {
      showWarning('주소를 입력해주세요.');
      return;
    }
    if (formData.address === originalAddress) {
      showWarning('주소가 변경되지 않았습니다.');
      return;
    }
    try {
      setIsSavingAddress(true);
      await updateMyAddress(formData.address);
      setOriginalAddress(formData.address);
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      showSuccess('주소가 저장되었습니다. 좌표가 자동 계산됩니다.');
    } catch (err: any) {
      showError(err.message || '주소 저장에 실패했습니다.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const isAddressChanged = formData.address !== originalAddress;

  // 이메일 인증 발송
  const handleSendCode = async () => {
    if (!formData.email) return;
    try {
      setIsSendingCode(true);
      await sendVerificationCode(formData.email);
      setEmailVerificationMsg('인증번호가 발송되었습니다.');
      setIsEmailVerified(false);
    } catch (e: any) {
      showError(e.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  // 이메일 인증 확인
  const handleVerifyCode = async () => {
    if (!formData.email || !emailCode) return;
    try {
      setIsVerifyingCode(true);
      await verifyEmailCode(formData.email, emailCode);
      setIsEmailVerified(true);
      setEmailVerificationMsg('인증되었습니다.');
    } catch (e: any) {
      setIsEmailVerified(false);
      showError(e.message);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  if (isLoading) {
    return (
      <ContentWrapper>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </ContentWrapper>
    );
  }

  if (error || !user) {
    return (
      <ContentWrapper>
        <div className="text-red-500 text-center py-8">사용자 정보를 불러오는데 실패했습니다.</div>
      </ContentWrapper>
    );
  }

  const isInstructor = !!user.instructor;
  const isAdmin = !!user.admin;

  if (!shouldRender) return null;

  return (
    <ContentWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 프로필 미완성 경고 배너 */}
        {isProfileIncomplete && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">강사 프로필 완성 필요</h3>
                <p className="mt-1 text-sm text-amber-700">
                  강사 기능을 이용하려면 아래 필수 정보를 입력해주세요.
                </p>
                <ul className="mt-2 text-xs text-amber-600 list-disc list-inside">
                  <li>주소 (활동 지역) - 필수</li>
                  <li>자차 여부 - 필수</li>
                  <li>강의 가능 과목 (최소 1개) - 필수</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 상단 헤더 카드 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-indigo-600 px-4 py-6 sm:py-8 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center min-w-0">
              <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 bg-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold text-indigo-600 border-4 border-indigo-200">
                {user.name.charAt(0)}
              </div>
              <div className="ml-3 sm:ml-4 text-white min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold truncate">{user.name}</h2>
                <p className="text-indigo-100 text-sm sm:text-base truncate">{user.userEmail}</p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={handleEditClick}
                className="shrink-0 self-end sm:self-auto bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm whitespace-nowrap"
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

                {/* 이메일 섹션 (인증 포함) */}
                <div className="sm:col-span-full border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700">이메일</label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          name="email"
                          value={formData.email || ''}
                          onChange={(e) => {
                            handleInputChange(e);
                            setIsEmailVerified(false);
                            setEmailVerificationMsg('');
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                        {formData.email !== user.userEmail && (
                          <button
                            type="button"
                            onClick={handleSendCode}
                            disabled={isSendingCode || isEmailVerified}
                            className="mt-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap disabled:opacity-50"
                          >
                            {isSendingCode
                              ? '발송 중'
                              : isEmailVerified
                                ? '인증됨'
                                : '인증번호 발송'}
                          </button>
                        )}
                      </div>
                      {/* 인증번호 입력창 */}
                      {formData.email !== user.userEmail && !isEmailVerified && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="인증번호 입력"
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value)}
                            className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={isVerifyingCode}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap disabled:opacity-50"
                          >
                            확인
                          </button>
                        </div>
                      )}
                      {emailVerificationMsg && (
                        <p
                          className={`text-xs ${
                            isEmailVerified ? 'text-green-600' : 'text-blue-600'
                          }`}
                        >
                          {emailVerificationMsg}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-gray-900">{user.userEmail}</div>
                  )}
                </div>

                {/* 비밀번호 변경 섹션 */}
                {isEditing && (
                  <div className="sm:col-span-full border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">비밀번호 변경</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <input
                          type="password"
                          name="password"
                          autoComplete="new-password"
                          placeholder="새 비밀번호 (변경시에만 입력)"
                          value={formData.password || ''}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          placeholder="새 비밀번호 확인"
                          autoComplete="new-password"
                          value={passwordConfirm}
                          onChange={handlePasswordConfirmChange}
                          disabled={!formData.password}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:bg-gray-100"
                        />
                      </div>
                    </div>
                    {passwordMismatch && (
                      <p className="mt-1 text-xs text-red-600">비밀번호가 일치하지 않습니다.</p>
                    )}
                  </div>
                )}

                {/* 강사 전용 필드 */}
                {isInstructor && (
                  <>
                    <div className="sm:col-span-full border-t border-gray-100 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">강사 활동 정보</h4>
                    </div>

                    <div className="sm:col-span-full">
                      <label className="block text-sm font-medium text-gray-700">주소</label>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              name="address"
                              readOnly
                              value={formData.address || ''}
                              onChange={handleInputChange}
                              className="mt-1 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm bg-gray-50 sm:text-sm p-2 border cursor-pointer"
                              onClick={handleAddressSearch}
                            />
                            <button
                              type="button"
                              onClick={handleAddressSearch}
                              className="mt-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-2 py-2 rounded-md text-xs font-medium whitespace-nowrap"
                            >
                              검색
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveAddress}
                              disabled={!isAddressChanged || isSavingAddress}
                              className={`mt-1 px-2 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                                isAddressChanged
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {isSavingAddress ? '...' : '저장'}
                            </button>
                          </div>
                          {isAddressChanged && (
                            <p className="text-xs text-amber-600">
                              ⚠️ 주소가 변경되었습니다. [주소 저장]을 눌러 저장하세요.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {user.instructor?.location || '-'}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">자차 여부</label>
                      {isEditing ? (
                        <div className="mt-2">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              name="hasCar"
                              checked={formData.hasCar || false}
                              onChange={handleCheckboxChange}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-600">
                              자차 보유 및 운행 가능
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {user.instructor?.hasCar ? '보유' : '미보유'}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">제한 지역</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="restrictedArea"
                          value={formData.restrictedArea || ''}
                          onChange={handleInputChange}
                          placeholder="예: 서울 강남구"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-900">
                          {user.instructor?.restrictedArea || '없음'}
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

                    <div className="sm:col-span-full">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        강의 가능 과목(덕목)
                      </label>
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2 p-2 border rounded-md border-gray-200 bg-gray-50">
                          {virtueOptions.map((v) => (
                            <label
                              key={v.id}
                              className="inline-flex items-center mr-3 mb-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                value={v.id}
                                checked={formData.virtueIds?.includes(v.id) || false}
                                onChange={() => handleVirtueToggle(v.id)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="ml-1.5 text-sm text-gray-700">{v.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </ContentWrapper>
  );
};

export default UserProfilePage;
