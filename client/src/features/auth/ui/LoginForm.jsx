//client/src/features/auth/ui/LoginForm.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputField } from '../../../shared/ui/InputField';
import { Button } from '../../../shared/ui/Button';

export const LoginForm = () => {
    const navigate = useNavigate();
    const [loginType, setLoginType] = useState('GENERAL'); 
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        // 로그인 로직...
        if (loginType === 'ADMIN') navigate('/admin');
        else navigate('/');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                
                {/* 로고 영역 */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                        <span className="text-white text-2xl font-bold">BTF</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">T-lecture</h1>
                    <p className="text-gray-500 text-sm mt-1">Instructor Dispatch Automation System</p>
                </div>

                {/* 탭 버튼 */}
                <div className="flex mb-8 border-b border-gray-200">
                    <button
                        className={`flex-1 py-3 text-center font-medium transition-colors ${
                            loginType === 'GENERAL' ? 'border-b-2 border-green-500 text-green-600 font-bold' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        onClick={() => setLoginType('GENERAL')}
                    >
                        일반 / 강사
                    </button>
                    <button
                        className={`flex-1 py-3 text-center font-medium transition-colors ${
                            loginType === 'ADMIN' ? 'border-b-2 border-green-500 text-green-600 font-bold' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        onClick={() => setLoginType('ADMIN')}
                    >
                        관리자
                    </button>
                </div>

                {/* 입력 폼 */}
                <form onSubmit={handleSubmit} className="space-y-2">
                    <InputField 
                        label="아이디 (이메일)"
                        placeholder="example@btf.or.kr"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <InputField 
                        label="비밀번호"
                        type="password"
                        placeholder="비밀번호 입력"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                    <div className="pt-4">
                        <Button type="submit" fullWidth variant="primary">
                            {loginType === 'ADMIN' ? '관리자 로그인' : '로그인'}
                        </Button>
                    </div>
                </form>
                
                <div className="mt-6 text-center text-sm text-gray-500 flex justify-center space-x-4">
                    <span className="cursor-pointer hover:text-gray-700">아이디 찾기</span>
                    <span className="border-r border-gray-300 h-4 self-center"></span>
                    <span className="cursor-pointer hover:text-gray-700">비밀번호 찾기</span>
                    {loginType !== 'ADMIN' && (
                        <>
                            <span className="border-r border-gray-300 h-4 self-center"></span>
                            <span 
                                onClick={() => navigate('/register')}
                                className="font-bold text-green-600 hover:text-green-700 cursor-pointer"
                            >
                                회원가입
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};