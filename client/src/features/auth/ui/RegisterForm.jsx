// client/src/features/auth/ui/RegisterForm.jsx

import React, { useState } from 'react';
import { InputField } from '../../../shared/ui/InputField';
import { Button } from '../../../shared/ui/Button';

export const RegisterForm = () => {
    const [userType, setUserType] = useState('INSTRUCTOR');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">회원가입</h2>
                <p className="text-center text-gray-500 mb-8">푸른나무재단에 오신 것을 환영합니다.</p>

                {/* 탭 버튼 */}
                <div className="flex mb-8 border-b border-gray-200">
                    <button
                        className={`flex-1 py-3 text-center font-medium transition-colors ${
                            userType === 'INSTRUCTOR' ? 'border-b-2 border-green-500 text-green-600 font-bold' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        onClick={() => setUserType('INSTRUCTOR')}
                    >
                        강사
                    </button>
                    <button
                        className={`flex-1 py-3 text-center font-medium transition-colors ${
                            userType === 'USER' ? 'border-b-2 border-green-500 text-green-600 font-bold' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        onClick={() => setUserType('USER')}
                    >
                        일반 (관계자)
                    </button>
                </div>

                <form className="space-y-4">
                    <InputField label="이름" required placeholder="실명을 입력하세요" />
                    <InputField label="아이디 (이메일)" required hasBtn="인증번호 발송" placeholder="example@btf.or.kr" />
                    <InputField label="비밀번호" type="password" required placeholder="영문, 숫자, 특수문자 포함 8자 이상" />
                    <InputField label="연락처" required placeholder="010-1234-5678" />

                    {userType === 'INSTRUCTOR' && (
                        <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="font-bold mb-4 text-sm text-gray-700">강사 활동 정보</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">거주지 주소 *</label>
                                    <div className="flex gap-2 mb-2">
                                        <input type="text" className="flex-1 p-2 border border-gray-300 rounded text-sm bg-white" placeholder="우편번호" readOnly />
                                        <button type="button" className="px-3 py-1 border border-green-600 text-green-600 rounded text-sm hover:bg-green-50">주소 찾기</button>
                                    </div>
                                    <input type="text" className="w-full p-2 border border-gray-300 rounded text-sm bg-white mb-2" placeholder="기본 주소" readOnly />
                                    <input type="text" className="w-full p-2 border border-gray-300 rounded text-sm" placeholder="상세 주소를 입력하세요" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="car" className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                                    <label htmlFor="car" className="text-sm text-gray-700">자차 보유 및 운행 가능</label>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-6">
                        <input type="checkbox" required className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                        <span className="text-sm text-gray-600">[필수] 이용약관 및 개인정보 처리방침에 동의합니다.</span>
                    </div>

                    <div className="pt-4">
                        <Button type="submit" fullWidth variant="primary">가입 신청</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};