// client/src/features/unit/ui/TrainingPeriodTab.tsx
// 교육기간 탭 전용 컴포넌트
// 근무시간, 담당관, 시설정보, 교육장소 입력/수정 담당

import { ChangeEvent, useState } from 'react';
import { showConfirm } from '../../../shared/utils/toast';
import { LocationAccordion, LocationData } from './LocationAccordion';
import { TimeDropdownPicker } from './TimeDropdownPicker';

export interface TrainingPeriodFormData {
  id?: number;
  name: string;

  // 근무시간 (HH:mm 형식)
  workStartTime: string;
  workEndTime: string;
  lunchStartTime: string;
  lunchEndTime: string;

  // 담당관
  officerName: string;
  officerPhone: string;
  officerEmail: string;

  // 시설 정보
  hasCateredMeals: boolean;
  hasHallLodging: boolean;
  allowsPhoneBeforeAfter: boolean;

  // 교육장소
  locations: LocationData[];

  // 일정 (날짜 목록)
  schedules: { id?: number; date: string }[];

  // 일정-장소 매핑 (scheduleId -> rows)
  scheduleLocationMap: Record<number | string, ScheduleLocationFormData[]>;

  // 배정여부 확인용 플래그 (삭제 방지 등 용도)
  hasAssignments?: boolean;
}

export interface ScheduleLocationFormData {
  trainingLocationId: number | string;
  plannedCount?: number | null;
  actualCount?: number | null;
  requiredCount?: number | null; // 수동 설정 필요인원
}

interface TrainingPeriodTabProps {
  data: TrainingPeriodFormData;
  onChange: (field: keyof TrainingPeriodFormData, value: unknown) => void;
  onLocationUpdate: (
    index: number,
    field: keyof LocationData,
    value: LocationData[keyof LocationData],
  ) => void;
  onLocationAdd: () => void;
  onLocationRemove: (index: number) => void;
  onScheduleLocationRowAdd: (scheduleIndex: number) => void;
  onScheduleLocationRowRemove: (scheduleIndex: number, rowIndex: number) => void;
  onScheduleLocationRowChange: (
    scheduleIndex: number,
    rowIndex: number,
    field: 'trainingLocationId' | 'plannedCount' | 'actualCount' | 'requiredCount',
    value: number | string | null,
  ) => void;
  onApplyFirstToAll?: () => void;
  // 섹션별 저장 핸들러
  onInfoSave?: () => Promise<void>;
  onLocationsSave?: () => Promise<void>;
  onCancelLocations?: () => void; // 장소 편집 취소 시 서버 데이터로 복원
  readOnly?: boolean;
}

// 시간 포맷 (Date -> HH:mm)
const formatTime = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '';
    return d.toTimeString().slice(0, 5);
  } catch {
    return '';
  }
};

// 날짜 포맷 (Date -> YYYY-MM-DD)
const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export const TrainingPeriodTab = ({
  data,
  onChange,
  onLocationUpdate,
  onLocationAdd,
  onLocationRemove,
  onScheduleLocationRowAdd,
  onScheduleLocationRowRemove,
  onScheduleLocationRowChange,
  onApplyFirstToAll,
  onInfoSave,
  onLocationsSave,
  onCancelLocations,
  readOnly = false,
}: TrainingPeriodTabProps) => {
  // 섹션별 편집 모드 상태
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingLocations, setIsEditingLocations] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isSavingLocations, setIsSavingLocations] = useState(false);

  const handleInputChange = (
    field: keyof TrainingPeriodFormData,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const target = e.target;
    let value: string | boolean;
    if (target.type === 'checkbox') {
      value = target.checked;
    } else {
      value = target.value;
    }
    onChange(field, value);
  };

  // 정보 섹션 저장
  const handleInfoSave = async () => {
    if (!onInfoSave) return;
    setIsSavingInfo(true);
    try {
      await onInfoSave();
      setIsEditingInfo(false);
    } finally {
      setIsSavingInfo(false);
    }
  };

  // 장소 섹션 저장
  const handleLocationsSave = async () => {
    if (!onLocationsSave) return;
    setIsSavingLocations(true);
    try {
      await onLocationsSave();
      setIsEditingLocations(false);
    } finally {
      setIsSavingLocations(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* ===== 섹션 1: 근무시간 + 담당관 + 시설정보 ===== */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700">기본 정보</h4>
          {!readOnly && (
            <div className="flex items-center gap-2">
              {isEditingInfo ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(false)}
                    className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                    disabled={isSavingInfo}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleInfoSave}
                    className="px-4 py-1.5 text-sm font-medium bg-green-500 text-white rounded hover:bg-green-600"
                    disabled={isSavingInfo}
                  >
                    {isSavingInfo ? '저장 중...' : '저장'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(true)}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                  수정
                </button>
              )}
            </div>
          )}
        </div>

        {/* 근무시간 */}
        <div className="mb-4">
          <h5 className="text-xs font-medium text-gray-500 mb-2">근무 시간</h5>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-16 shrink-0">근무시간:</label>
              <TimeDropdownPicker
                value={data.workStartTime}
                onChange={(val) => onChange('workStartTime', val)}
                disabled={!isEditingInfo}
              />
              <span className="text-gray-400">~</span>
              <TimeDropdownPicker
                value={data.workEndTime}
                onChange={(val) => onChange('workEndTime', val)}
                disabled={!isEditingInfo}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 w-16 shrink-0">점심시간:</label>
              <TimeDropdownPicker
                value={data.lunchStartTime}
                onChange={(val) => onChange('lunchStartTime', val)}
                disabled={!isEditingInfo}
              />
              <span className="text-gray-400">~</span>
              <TimeDropdownPicker
                value={data.lunchEndTime}
                onChange={(val) => onChange('lunchEndTime', val)}
                disabled={!isEditingInfo}
              />
            </div>
          </div>
        </div>

        {/* 담당관 정보 */}
        <div className="mb-4">
          <h5 className="text-xs font-medium text-gray-500 mb-2">담당관 정보</h5>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">담당관</label>
              <input
                type="text"
                value={data.officerName}
                onChange={(e) => onChange('officerName', e.target.value)}
                disabled={!isEditingInfo}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                placeholder="이름"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">담당관 연락처</label>
              <input
                type="text"
                value={data.officerPhone}
                onChange={(e) => onChange('officerPhone', e.target.value)}
                disabled={!isEditingInfo}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">담당관 이메일</label>
              <input
                type="email"
                value={data.officerEmail}
                onChange={(e) => onChange('officerEmail', e.target.value)}
                disabled={!isEditingInfo}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                placeholder="name@example.com"
              />
            </div>
          </div>
        </div>

        {/* 시설 정보 */}
        <div>
          <h5 className="text-xs font-medium text-gray-500 mb-2">시설 정보</h5>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.hasCateredMeals}
                onChange={(e) => handleInputChange('hasCateredMeals', e)}
                disabled={!isEditingInfo}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm">수탁급식</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.hasHallLodging}
                onChange={(e) => handleInputChange('hasHallLodging', e)}
                disabled={!isEditingInfo}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm">회관숙박</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.allowsPhoneBeforeAfter}
                onChange={(e) => handleInputChange('allowsPhoneBeforeAfter', e)}
                disabled={!isEditingInfo}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm">사전사후 휴대폰 불출</span>
            </label>
          </div>
        </div>
      </div>

      {/* ===== 섹션 2: 교육장소 + 일정별 장소 매칭 ===== */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-700">장소 정보</h4>
          {!readOnly && (
            <div className="flex items-center gap-2">
              {isEditingLocations ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingLocations(false);
                      onCancelLocations?.(); // 서버 데이터로 복원
                    }}
                    className="px-4 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                    disabled={isSavingLocations}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleLocationsSave}
                    className="px-4 py-1.5 text-sm font-medium bg-green-500 text-white rounded hover:bg-green-600"
                    disabled={isSavingLocations}
                  >
                    {isSavingLocations ? '저장 중...' : '저장'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingLocations(true)}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                  수정
                </button>
              )}
            </div>
          )}
        </div>

        {/* 교육장소 아코디언 */}
        <LocationAccordion
          locations={data.locations}
          onUpdate={onLocationUpdate}
          onRemove={onLocationRemove}
          onAdd={onLocationAdd}
          readOnly={!isEditingLocations}
        />

        {/* 일정별 장소 매칭 */}
        {data.schedules.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h5 className="text-xs font-medium text-gray-500">
                  일정별 장소 매칭 ({data.schedules.length}개)
                </h5>
                {isEditingLocations && data.schedules.length > 1 && onApplyFirstToAll && (
                  <button
                    type="button"
                    onClick={onApplyFirstToAll}
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    첫 번째 날짜로 전체 적용
                  </button>
                )}
              </div>
              {/* 장소 저장 버튼은 섹션 2 헤더로 이동 예정 */}
            </div>

            {/* 헤더 - 한 번만 표시 */}
            <div className="grid grid-cols-[100px_1fr_70px_70px_70px_30px] gap-2 text-xs text-gray-500 mb-2 px-2 pb-2 border-b border-gray-300">
              <span>날짜</span>
              <span>장소</span>
              <span className="text-center">계획</span>
              <span className="text-center">참여</span>
              <span className="text-center text-[10px] leading-tight">
                강사필요
                <br />
                (자동계산)
              </span>
              <span></span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {data.schedules.map((schedule, scheduleIndex) => {
                const scheduleKey = schedule.id ?? `new-${scheduleIndex}`;
                const rows = data.scheduleLocationMap[scheduleKey] || [];
                const isLastSchedule = scheduleIndex === data.schedules.length - 1;

                return (
                  <div
                    key={scheduleKey}
                    className={`py-2 ${!isLastSchedule ? 'border-b border-dashed border-gray-200' : ''}`}
                  >
                    {/* 장소 매칭이 없는 경우 빈 행 표시 */}
                    {rows.length === 0 ? (
                      <div className="grid grid-cols-[100px_1fr_70px_70px_70px_30px] gap-2 items-center px-2 py-1">
                        <div className="text-sm text-gray-700">{formatDate(schedule.date)}</div>
                        <select
                          value=""
                          onChange={(e) =>
                            onScheduleLocationRowChange(
                              scheduleIndex,
                              0,
                              'trainingLocationId',
                              e.target.value,
                            )
                          }
                          disabled={!isEditingLocations}
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                        >
                          <option value="">장소 선택</option>
                          {data.locations.map((loc, locIdx) => (
                            <option
                              key={loc.id ?? `loc-${locIdx}`}
                              value={loc.id ?? `loc-${locIdx}`}
                            >
                              {loc.changedPlace || loc.originalPlace || `장소 ${locIdx + 1}`}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          value=""
                          onChange={(e) =>
                            onScheduleLocationRowChange(
                              scheduleIndex,
                              0,
                              'plannedCount',
                              e.target.value === '' ? null : Number(e.target.value),
                            )
                          }
                          disabled={!isEditingLocations}
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center disabled:bg-gray-100 w-full"
                        />
                        <input
                          type="number"
                          min={0}
                          value=""
                          onChange={(e) =>
                            onScheduleLocationRowChange(
                              scheduleIndex,
                              0,
                              'actualCount',
                              e.target.value === '' ? null : Number(e.target.value),
                            )
                          }
                          disabled={!isEditingLocations}
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center disabled:bg-gray-100 w-full"
                        />
                        <input
                          type="number"
                          min={0}
                          value=""
                          onChange={(e) =>
                            onScheduleLocationRowChange(
                              scheduleIndex,
                              0,
                              'requiredCount',
                              e.target.value === '' ? null : Number(e.target.value),
                            )
                          }
                          disabled={!isEditingLocations}
                          placeholder="자동"
                          className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center disabled:bg-gray-100 w-full"
                        />
                        <div></div>
                      </div>
                    ) : (
                      rows.map((row, rowIndex) => (
                        <div
                          key={`${scheduleKey}-row-${rowIndex}`}
                          className="grid grid-cols-[100px_1fr_70px_70px_70px_30px] gap-2 items-center px-2 py-1"
                        >
                          {/* 날짜 - 첫 번째 행에만 표시 */}
                          <div className="text-sm text-gray-700">
                            {rowIndex === 0 ? formatDate(schedule.date) : ''}
                          </div>

                          <select
                            value={row.trainingLocationId}
                            onChange={(e) =>
                              onScheduleLocationRowChange(
                                scheduleIndex,
                                rowIndex,
                                'trainingLocationId',
                                e.target.value,
                              )
                            }
                            disabled={!isEditingLocations}
                            className="px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                          >
                            <option value="">장소 선택</option>
                            {data.locations.map((loc, locIdx) => (
                              <option
                                key={loc.id ?? `loc-${locIdx}`}
                                value={loc.id ?? loc.originalPlace}
                              >
                                {loc.changedPlace || loc.originalPlace || `장소 ${locIdx + 1}`}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min={0}
                            value={row.plannedCount ?? ''}
                            onChange={(e) =>
                              onScheduleLocationRowChange(
                                scheduleIndex,
                                rowIndex,
                                'plannedCount',
                                e.target.value === '' ? null : Number(e.target.value),
                              )
                            }
                            disabled={!isEditingLocations}
                            className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center disabled:bg-gray-100 w-full"
                          />

                          <input
                            type="number"
                            min={0}
                            value={row.actualCount ?? ''}
                            onChange={(e) =>
                              onScheduleLocationRowChange(
                                scheduleIndex,
                                rowIndex,
                                'actualCount',
                                e.target.value === '' ? null : Number(e.target.value),
                              )
                            }
                            disabled={!isEditingLocations}
                            className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center disabled:bg-gray-100 w-full"
                          />

                          <input
                            type="number"
                            min={0}
                            value={row.requiredCount ?? ''}
                            onChange={(e) =>
                              onScheduleLocationRowChange(
                                scheduleIndex,
                                rowIndex,
                                'requiredCount',
                                e.target.value === '' ? null : Number(e.target.value),
                              )
                            }
                            disabled={!isEditingLocations}
                            placeholder="자동"
                            className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center disabled:bg-gray-100 w-full"
                          />

                          <div className="flex justify-center">
                            {isEditingLocations && (
                              <button
                                type="button"
                                onClick={async () => {
                                  // 해당 장소에 배정이 있는지 확인
                                  const locationId = Number(row.trainingLocationId);
                                  const location = data.locations.find(
                                    (loc) => loc.id === locationId,
                                  );
                                  // 배정이 있으면 확인, 없으면 바로 삭제
                                  if (location?.hasAssignments) {
                                    const confirmed = await showConfirm(
                                      '이 장소에 배정이 존재합니다. 삭제하시겠습니까?',
                                    );
                                    if (confirmed) {
                                      onScheduleLocationRowRemove(scheduleIndex, rowIndex);
                                    }
                                  } else {
                                    onScheduleLocationRowRemove(scheduleIndex, rowIndex);
                                  }
                                }}
                                className="text-xs text-red-400 hover:text-red-600"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {/* 장소 추가 버튼 */}
                    {isEditingLocations && (
                      <button
                        type="button"
                        onClick={() => onScheduleLocationRowAdd(scheduleIndex)}
                        className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1"
                      >
                        + 장소 추가
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { formatTime, formatDate };
