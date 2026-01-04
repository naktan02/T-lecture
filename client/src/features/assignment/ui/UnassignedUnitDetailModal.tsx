// src/features/assignment/ui/UnassignedUnitDetailModal.tsx
// 미배정 부대 상세 모달 - 부대 정보 + 장소별 상세

import { useState } from 'react';
import { Button } from '../../../shared/ui';
import { formatBool, formatTimeDisplay, formatDateDisplay } from '../../../shared/utils';
import { GroupedUnassignedUnit } from '../model/useAssignment';

interface Props {
  unit: GroupedUnassignedUnit;
  onClose: () => void;
}

export const UnassignedUnitDetailModal: React.FC<Props> = ({ unit, onClose }) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const selectedLocation = unit.locations.find((l) => l.locationId === selectedLocationId);

  // detail에서 부대 정보와 장소 정보 추출
  const { detail } = unit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fadeInScale">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-start bg-gradient-to-r from-red-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              {unit.unitName}
              {unit.locations.length > 1 && (
                <span className="text-sm font-normal text-purple-600 bg-purple-100 px-2 py-1 rounded-md">
                  {unit.locations.length}개 장소
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              📍 {unit.region} | 📅 {unit.uniqueDates.length}일 | 👤 총 {unit.totalRequired}명 필요
            </p>
          </div>
          <Button
            variant="ghost"
            size="small"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            ✕
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* 부대 공통 정보 - Unit 모델의 모든 필드 */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-700 mb-3">🏢 부대 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <InfoRow label="부대명" value={unit.unitName} />
              <InfoRow label="광역" value={String(detail.wideArea || '-')} />
              <InfoRow label="지역" value={unit.region} />
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
            </div>

            {/* 일정 표시 */}
            <div className="mt-4">
              <span className="text-xs font-bold text-gray-500">교육 일정</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {unit.uniqueDates.map((date) => (
                  <span key={date} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {date}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 장소 선택 */}
          <div className="px-6 py-4">
            <h3 className="font-bold text-gray-700 mb-3">🏫 교육 장소 선택</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unit.locations.map((loc) => (
                <button
                  key={loc.locationId}
                  onClick={() =>
                    setSelectedLocationId(
                      selectedLocationId === loc.locationId ? null : loc.locationId,
                    )
                  }
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedLocationId === loc.locationId
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow'
                  }`}
                >
                  <div className="font-bold text-gray-800">{loc.locationName}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    👤 {loc.instructorsRequired}명 필요
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 선택된 장소 상세 - TrainingLocation 모델의 모든 필드 */}
          {selectedLocation && (
            <div className="px-6 py-4 border-t bg-indigo-50">
              <h3 className="font-bold text-indigo-900 mb-3">
                📋 {selectedLocation.locationName} 상세
              </h3>
              <div className="bg-white rounded-lg p-4 border border-indigo-200">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {/* 장소 기본 정보 */}
                  <InfoRow label="기존 교육장소" value={String(detail.originalPlace || '-')} />
                  <InfoRow label="변경 교육장소" value={String(detail.changedPlace || '-')} />
                  <InfoRow label="필요 인원" value={`${selectedLocation.instructorsRequired}명`} />

                  {/* 인원 정보 */}
                  <InfoRow
                    label="계획 인원"
                    value={detail.plannedCount ? `${detail.plannedCount}명` : '-'}
                  />
                  <InfoRow
                    label="참여 인원"
                    value={detail.actualCount ? `${detail.actualCount}명` : '-'}
                  />

                  {/* 시설 정보 */}
                  <InfoRow label="강사 휴게실" value={formatBool(detail.hasInstructorLounge)} />
                  <InfoRow label="여자 화장실" value={formatBool(detail.hasWomenRestroom)} />
                  <InfoRow label="수탁 급식" value={formatBool(detail.hasCateredMeals)} />
                  <InfoRow label="회관 숙박" value={formatBool(detail.hasHallLodging)} />
                  <InfoRow label="휴대폰 불출" value={formatBool(detail.allowsPhoneBeforeAfter)} />
                </div>

                {/* 특이사항 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-xs font-bold text-gray-500">특이사항</span>
                  <p className="mt-1 text-sm text-gray-700">
                    {detail.note ? String(detail.note) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
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
