import React from 'react';
import { useAssignment } from '../model/useAssignment';

export const AssignmentWorkspace = () => {
    const { dateRange, setDateRange, loading, unassignedUnits, availableInstructors } = useAssignment();

    // 날짜 변경 핸들러 (Native Input 사용)
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({
            ...prev,
            [name]: new Date(value)
        }));
    };

    // Date 객체를 YYYY-MM-DD 문자열로 변환
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            {/* 1. Control Bar (Date Picker) */}
            <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-gray-800">배정 기간 설정</h2>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded border border-gray-300">
                        <input
                            type="date"
                            name="startDate"
                            value={formatDate(dateRange.startDate)}
                            onChange={handleDateChange}
                            className="bg-transparent focus:outline-none text-sm"
                        />
                        <span className="text-gray-400">~</span>
                        <input
                            type="date"
                            name="endDate"
                            value={formatDate(dateRange.endDate)}
                            onChange={handleDateChange}
                            className="bg-transparent focus:outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 transition">
                        조회하기
                    </button>
                </div>
            </div>

            {/* 2. Main Workspace (Grid) */}
            <div className="flex-1 p-4 grid grid-cols-2 gap-4 overflow-hidden bg-gray-100">
                {/* Left Column: Source Data */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    {/* Panel 1: Unassigned Units */}
                    <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-3 bg-red-50 border-b border-red-100 border-l-4 border-l-red-500 font-bold text-gray-700 flex justify-between">
                            <span>📋 배정 대상 부대 (미배정)</span>
                            <span className="text-xs bg-white px-2 py-1 rounded border border-red-200 text-red-600">
                                {unassignedUnits.length}건
                            </span>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                            {loading ? (
                                <div className="text-center text-gray-500 mt-10">데이터를 불러오는 중입니다...</div>
                            ) : unassignedUnits.length === 0 ? (
                                <div className="text-center text-gray-400 mt-10 text-sm">데이터가 없습니다.</div>
                            ) : (
                                <div className="space-y-2">
                                    {unassignedUnits.map(unit => (
                                        <div key={unit.id} className="bg-white border border-gray-200 rounded p-3 cursor-pointer hover:shadow-md hover:border-red-300 transition-all border-l-4 border-l-red-400">
                                            <div className="font-bold text-gray-800 text-sm">
                                                {unit.date} {unit.time} | {unit.unitName}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                                <span>📍 {unit.location}</span>
                                                <span className="text-red-500 font-medium">필요: 주{unit.reqMain}, 보{unit.reqSub}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel 2: Available Instructors */}
                    <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 border-l-4 border-l-slate-700 font-bold text-gray-700">
                            <span>👤 가용 강사</span>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                            {loading ? (
                                <div className="text-center text-gray-500 mt-10">로딩 중...</div>
                            ) : availableInstructors.length === 0 ? (
                                <div className="text-center text-gray-400 mt-10 text-sm">데이터가 없습니다.</div>
                            ) : (
                                <div className="space-y-2">
                                    {availableInstructors.map(inst => (
                                        <div key={inst.id} className="bg-white border border-gray-200 rounded p-3 cursor-pointer hover:shadow-md hover:border-slate-400 transition-all">
                                            <div className="font-bold text-gray-800 text-sm">
                                                {inst.name} <span className="text-xs font-normal text-gray-500">({inst.role})</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                📍 {inst.location} | 📅 {inst.availableDates.join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Target (Skeleton) */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    {/* Panel 3: Temporary Assignments */}
                    <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-3 bg-orange-50 border-b border-orange-100 border-l-4 border-l-orange-500 font-bold text-gray-700">
                            <span>⚖️ 임시 배정 (작업 공간)</span>
                        </div>
                        <div className="flex-1 p-4 bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200 m-2 rounded">
                            <span className="text-gray-400 text-sm">
                                이곳에 강사를 드래그하여 배정하세요.
                            </span>
                        </div>
                    </div>

                    {/* Panel 4: Confirmed Assignments */}
                    <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-3 bg-blue-50 border-b border-blue-100 border-l-4 border-l-blue-500 font-bold text-gray-700">
                            <span>✅ 확정 배정</span>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                            <div className="text-center text-gray-400 mt-10 text-sm">
                                확정된 배정이 없습니다.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
