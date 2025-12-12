// src/entities/user/ui/InstructorFields.jsx

import React from "react";

/**
 * 강사 전용 입력 필드: 주소 / 팀 / 직책 / 덕목 / 자차 여부
 */
export const InstructorFields = ({
    form,
    options,
    loadingOptions,
    onChange,
    onToggleVirtue,
    }) => {
    return (
        <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-bold mb-4 text-sm text-gray-700">
            강사 활동 정보
        </h3>

        {loadingOptions ? (
            <p className="text-sm text-gray-500">
            강의 관련 옵션 불러오는 중...
            </p>
        ) : (
            <div className="space-y-4">
            {/* 거주지 주소 */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                거주지 주소 *
                </label>
                <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                placeholder="시/군/구까지 포함하여 입력하세요"
                value={form.address}
                onChange={onChange("address")}
                required
                />
            </div>

            {/* 팀: select */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                소속 팀 *
                </label>
                <select
                className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                value={form.teamId}
                onChange={onChange("teamId")}
                >
                <option value="">선택하세요</option>
                {options.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                    {team.name}
                    </option>
                ))}
                </select>
            </div>

            {/* 직책(UserCategory): select */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                직책 *
                </label>
                <select
                className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                value={form.category}
                onChange={onChange("category")}
                >
                <option value="">선택하세요</option>
                {options.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                    {c.label}
                    </option>
                ))}
                </select>
            </div>

            {/* 과목(덕목): 체크박스 목록 */}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                강의 가능 과목(덕목) *
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                {options.virtues.map((v) => {
                    const checked = form.virtueIds.includes(v.id);
                    return (
                    <label
                        key={v.id}
                        className="flex items-center gap-1 text-xs text-gray-700"
                    >
                        <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleVirtue(v.id)}
                        />
                        <span>{v.name}</span>
                    </label>
                    );
                })}
                </div>
            </div>

            {/* 자차 여부 */}
            <div className="flex items-center gap-2">
                <input
                type="checkbox"
                id="car"
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                checked={form.hasCar}
                onChange={onChange("hasCar")}
                />
                <label htmlFor="car" className="text-sm text-gray-700">
                자차 보유 및 운행 가능
                </label>
            </div>
            </div>
        )}
        </div>
    );
};
