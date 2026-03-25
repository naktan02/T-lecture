// src/features/assignment/ui/UnassignedUnitDetailModal.tsx
// 미배정 부대 상세 모달 - 부대 정보 표시 + 편집 기능 연결

import { useState, useEffect } from 'react';
import { Button } from '../../../shared/ui';
import { formatBool, formatTimeDisplay, formatDateDisplay } from '../../../shared/utils';
import { GroupedUnassignedUnit } from '../model/useAssignment';
import { AssignmentUnitEditModal } from './AssignmentUnitEditModal';

interface Props {
  unit: GroupedUnassignedUnit;
  onClose: () => void;
  onSave?: () => void | Promise<void>; // 저장 후 목록 새로고침 (현재는 로컬 상태로 처리)
  onUnitUpdate?: (updatedUnit: GroupedUnassignedUnit) => void; // 로컬 상태 업데이트
  assignedDates?: Set<string>; // 이미 이 부대에 배정(임시/확정)이 있는 날짜들
}

export const UnassignedUnitDetailModal: React.FC<Props> = ({
  unit,
  onClose,
  onSave,
  onUnitUpdate,
  assignedDates,
}) => {
  // 로컬 상태로 unit 데이터 관리 (편집 시 즉시 반영)
  const [localUnit, setLocalUnit] = useState<GroupedUnassignedUnit>(unit);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // prop unit이 변경되면 로컬 상태 동기화
  useEffect(() => {
    setLocalUnit(unit);
  }, [unit]);

  // detail에서 부대 정보와 장소 정보 추출
  const { detail } = localUnit;

  // 편집 모달 열기
  const handleOpenEdit = () => {
    setShowEditModal(true);
  };

  // 편집 저장 후 - 로컬 상태 즉시 업데이트 + 전체 데이터 새로고침
  const handleEditSave = (updatedSchedules?: { id: number; date: string }[]) => {
    // 일정이 업데이트되었으면 로컬 상태 반영
    if (updatedSchedules) {
      const newUniqueDates = updatedSchedules.map((s) => s.date).sort();
      const updatedUnit: GroupedUnassignedUnit = {
        ...localUnit,
        uniqueDates: newUniqueDates,
        // locations의 schedules도 업데이트
        locations: localUnit.locations.map((loc) => ({
          ...loc,
          schedules: updatedSchedules.map((s) => ({
            date: s.date,
            scheduleId: String(s.id),
            plannedCount: loc.schedules.find((ls) => ls.date === s.date)?.plannedCount ?? null,
            actualCount: loc.schedules.find((ls) => ls.date === s.date)?.actualCount ?? null,
            requiredCount: loc.schedules.find((ls) => ls.date === s.date)?.requiredCount ?? null,
          })),
        })),
      };
      setLocalUnit(updatedUnit);
      onUnitUpdate?.(updatedUnit);
    }
    // 배정 데이터도 변경되었을 수 있으므로 전체 새로고침
    onSave?.();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fadeInScale">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-start bg-gradient-to-r from-red-50 to-white">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {localUnit.unitName}
                {localUnit.locations.length > 1 && (
                  <span className="text-sm font-normal text-purple-600 bg-purple-100 px-2 py-1 rounded-md">
                    {localUnit.locations.length}개 장소
                  </span>
                )}
                {localUnit.trainingPeriodName && (
                  <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                    {localUnit.trainingPeriodName}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                📍 {localUnit.region} | 📅 {localUnit.uniqueDates.length}일 | 👤 총{' '}
                {localUnit.totalRequired}명 필요
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="small" onClick={handleOpenEdit}>
                ✏️ 상세 편집
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {/* 부대 공통 정보 */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-700 mb-3">🏢 부대 정보</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <InfoRow label="부대명" value={localUnit.unitName} />
                <InfoRow label="교육기간명" value={String(localUnit.trainingPeriodName || '-')} />
                <InfoRow label="광역" value={String(detail.wideArea || '-')} />
                <InfoRow label="지역" value={localUnit.region} />
                <InfoRow label="부대주소" value={String(detail.address || '-')} isLong />
                <InfoRow label="상세주소" value={String(detail.detailAddress || '-')} isLong />

                {/* 교육 기간 */}
                <InfoRow label="교육 시작일" value={formatDateDisplay(detail.educationStart)} />
                <InfoRow label="교육 종료일" value={formatDateDisplay(detail.educationEnd)} />

                {/* 근무 시간 */}
                <InfoRow label="근무 시작" value={formatTimeDisplay(detail.workStartTime)} />
                <InfoRow label="근무 종료" value={formatTimeDisplay(detail.workEndTime)} />
                <InfoRow label="점심 시작" value={formatTimeDisplay(detail.lunchStartTime)} />
                <InfoRow label="점심 종료" value={formatTimeDisplay(detail.lunchEndTime)} />

                {/* 담당자 정보 */}
                <InfoRow label="간부명" value={String(detail.officerName || '-')} />
                <InfoRow label="간부 전화번호" value={String(detail.officerPhone || '-')} />
                <InfoRow label="간부 이메일" value={String(detail.officerEmail || '-')} isLong />

                {/* 교육기간 편의시설 */}
                <InfoRow label="수탁 급식" value={formatBool(detail.hasCateredMeals)} />
                <InfoRow label="회관 숙박" value={formatBool(detail.hasHallLodging)} />
                <InfoRow label="휴대폰 불출" value={formatBool(detail.allowsPhoneBeforeAfter)} />
              </div>

              {/* 일정 표시 */}
              <div className="mt-4">
                <span className="text-xs font-bold text-gray-500">교육 일정</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {localUnit.uniqueDates.map((date) => (
                    <span
                      key={date}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                    >
                      {date}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 일정 선택 */}
            <div className="px-6 py-4">
              <h3 className="font-bold text-gray-700 mb-3">📅 교육 일정 선택</h3>
              <div className="flex flex-wrap gap-2">
                {localUnit.uniqueDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(selectedDate === date ? null : date)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedDate === date
                        ? 'border-indigo-500 bg-indigo-50 shadow-md font-bold'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow'
                    }`}
                  >
                    <div className="text-sm text-gray-800">{date}</div>
                    <div className="text-xs text-gray-500">
                      {
                        localUnit.locations.filter((loc) =>
                          loc.schedules.some((s) => s.date === date),
                        ).length
                      }
                      개 장소
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 선택된 날짜의 장소별 상세 */}
            {selectedDate && (
              <div className="px-6 py-4 border-t bg-indigo-50">
                <h3 className="font-bold text-indigo-900 mb-3">📋 {selectedDate} 장소별 정보</h3>
                <div className="space-y-3">
                  {localUnit.locations
                    .filter((loc) => loc.schedules.some((s) => s.date === selectedDate))
                    .map((loc) => {
                      // 해당 날짜의 스케줄 정보 찾기
                      const scheduleInfo = loc.schedules.find((s) => s.date === selectedDate);
                      return (
                        <div
                          key={loc.locationId}
                          className="bg-white rounded-lg p-4 border border-indigo-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-gray-800 text-lg">
                              🏫 {loc.locationName}
                            </span>
                            <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                              👤 {scheduleInfo?.requiredCount ?? loc.instructorsRequired ?? 1}명
                              필요
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <InfoRow
                              label="계획 인원"
                              value={
                                scheduleInfo?.plannedCount ? `${scheduleInfo.plannedCount}명` : '-'
                              }
                            />
                            <InfoRow
                              label="참여 인원"
                              value={
                                scheduleInfo?.actualCount ? `${scheduleInfo.actualCount}명` : '-'
                              }
                            />
                            <InfoRow
                              label="필요 인원"
                              value={`${scheduleInfo?.requiredCount ?? loc.instructorsRequired ?? 1}명`}
                            />
                            <InfoRow
                              label="강사 휴게실"
                              value={formatBool(detail.hasInstructorLounge)}
                            />
                            <InfoRow
                              label="여자 화장실"
                              value={formatBool(detail.hasWomenRestroom)}
                            />
                          </div>
                          {detail.note && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <span className="text-xs font-bold text-gray-500">특이사항</span>
                              <p className="mt-1 text-sm text-gray-700">{String(detail.note)}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-white flex justify-between">
            <Button variant="primary" onClick={handleOpenEdit}>
              ✏️ 상세 편집
            </Button>
            <Button variant="secondary" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
      </div>

      {/* 편집 모달 */}
      {showEditModal && (
        <AssignmentUnitEditModal
          unit={localUnit}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
          assignedDates={assignedDates}
        />
      )}
    </>
  );
};

// 정보 행 컴포넌트
interface InfoRowProps {
  label: string;
  value: string | number | undefined;
  isLong?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, isLong }) => (
  <div className={isLong ? 'col-span-2 md:col-span-3' : ''}>
    <span className="text-gray-500">{label}:</span>
    <span className="ml-2 font-medium text-gray-800">{value ?? '-'}</span>
  </div>
);
