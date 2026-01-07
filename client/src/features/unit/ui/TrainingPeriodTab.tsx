// client/src/features/unit/ui/TrainingPeriodTab.tsx
// 교육기간 탭 전용 컴포넌트
// 근무시간, 담당관, 시설정보, 교육장소 입력/수정 담당

import { ChangeEvent } from 'react';
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
    field: 'trainingLocationId' | 'plannedCount' | 'actualCount',
    value: number | string | null,
  ) => void;
  onScheduleLocationsSave?: () => void;
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
  onScheduleLocationsSave,
  readOnly = false,
}: TrainingPeriodTabProps) => {
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

  return (
    <div className="space-y-6 p-4">
      {/* 근무시간 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">근무 시간</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-16 shrink-0">근무시간:</label>
            <TimeDropdownPicker
              value={data.workStartTime}
              onChange={(val) => onChange('workStartTime', val)}
              disabled={readOnly}
            />
            <span className="text-gray-400">~</span>
            <TimeDropdownPicker
              value={data.workEndTime}
              onChange={(val) => onChange('workEndTime', val)}
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-16 shrink-0">점심시간:</label>
            <TimeDropdownPicker
              value={data.lunchStartTime}
              onChange={(val) => onChange('lunchStartTime', val)}
              disabled={readOnly}
            />
            <span className="text-gray-400">~</span>
            <TimeDropdownPicker
              value={data.lunchEndTime}
              onChange={(val) => onChange('lunchEndTime', val)}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* 담당관 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">담당관 정보</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">담당관</label>
            <input
              type="text"
              value={data.officerName}
              onChange={(e) => onChange('officerName', e.target.value)}
              disabled={readOnly}
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
              disabled={readOnly}
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
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
              placeholder="name@example.com"
            />
          </div>
        </div>
      </div>

      {/* 시설 정보 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">시설 정보</h4>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.hasCateredMeals}
              onChange={(e) => handleInputChange('hasCateredMeals', e)}
              disabled={readOnly}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm">수탁급식</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.hasHallLodging}
              onChange={(e) => handleInputChange('hasHallLodging', e)}
              disabled={readOnly}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm">회관숙박</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.allowsPhoneBeforeAfter}
              onChange={(e) => handleInputChange('allowsPhoneBeforeAfter', e)}
              disabled={readOnly}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm">사전사후 휴대폰 불출</span>
          </label>
        </div>
      </div>

      {/* 교육장소 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <LocationAccordion
          locations={data.locations}
          onUpdate={onLocationUpdate}
          onRemove={onLocationRemove}
          onAdd={onLocationAdd}
          readOnly={readOnly}
        />
      </div>

      {/* 일정별 장소 매칭 섹션 */}
      {data.schedules.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            일정별 장소 매칭 ({data.schedules.length}개)
          </h4>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.schedules.map((schedule, scheduleIndex) => {
              const scheduleKey = schedule.id ?? `new-${scheduleIndex}`;
              const rows = data.scheduleLocationMap[scheduleKey] || [];

              return (
                <div key={scheduleKey} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="grid grid-cols-[140px_1fr_110px_110px_48px] gap-2 text-xs text-gray-500 mb-2">
                    <span>날짜</span>
                    <span>장소</span>
                    <span>계획인원</span>
                    <span>참여인원</span>
                    <span></span>
                  </div>

                  {rows.length === 0 ? (
                    <div className="text-xs text-gray-400">장소가 매칭되지 않았습니다.</div>
                  ) : (
                    rows.map((row, rowIndex) => (
                      <div
                        key={`${scheduleKey}-row-${rowIndex}`}
                        className="grid grid-cols-[140px_1fr_110px_110px_48px] gap-2 items-center py-1"
                      >
                        <div className="text-sm text-gray-700">
                          {formatDate(schedule.date) || `일정 ${scheduleIndex + 1}`}
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
                          disabled={readOnly}
                          className="px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                        >
                          <option value="">장소 선택</option>
                          {data.locations.map((loc, locIdx) => (
                            <option
                              key={loc.id ?? `loc-${locIdx}`}
                              value={loc.id ?? `loc-${locIdx}`}
                            >
                              {loc.originalPlace || `장소 ${locIdx + 1}`}
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
                          disabled={readOnly}
                          className="px-2 py-2 border border-gray-300 rounded text-xs disabled:bg-gray-100"
                          placeholder="계획"
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
                          disabled={readOnly}
                          className="px-2 py-2 border border-gray-300 rounded text-xs disabled:bg-gray-100"
                          placeholder="참여"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => {
                              showConfirm('이 장소 매칭을 삭제하시겠습니까?', () =>
                                onScheduleLocationRowRemove(scheduleIndex, rowIndex),
                              );
                            }}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    ))
                  )}

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onScheduleLocationRowAdd(scheduleIndex)}
                      className="w-full text-center mt-2 px-2 py-2 text-xs text-gray-400 hover:text-gray-600 border-t border-dashed"
                    >
                      + 장소 추가
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!readOnly && (
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={onScheduleLocationsSave}
                className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                장소 매칭 저장
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { formatTime, formatDate };
