// src/features/assignment/ui/AssignmentDetailModal.tsx

import { useMemo, useState, ReactNode } from 'react';
import { DetailModal, MiniCalendar, Button, ConfirmModal } from '../../../shared/ui';
import { InstructorSelectionPopup } from './InstructorSelectionPopup';
import { logger } from '../../../shared/utils';

// --- Types ---
interface FieldConfig {
  key: string;
  label: string;
  isLong?: boolean;
  format?: (val: unknown) => ReactNode;
}

interface ModalField {
  label: string;
  isLong?: boolean;
  value: ReactNode;
}

interface ModalContent {
  title: string;
  subtitle: string;
  fields: ModalField[];
}

interface Item {
  type?: string;
  name?: string;
  unitName?: string;
  teamName?: string;
  category?: string;
  role?: string;
  originalPlace?: string;
  date?: string;
  detail?: Record<string, unknown>;
  [key: string]: unknown;
}

interface Instructor {
  instructorId: number;
  name: string;
  team: string;
  role?: string | null; // Head, Supervisor, or null
  category?: string | null; // Main, Co, Assistant, Practicum
}

interface DateInfo {
  unitScheduleId: number;
  date: string;
  requiredCount: number;
  instructors: Instructor[];
}

interface TrainingLocation {
  id: number;
  name: string;
  dates: DateInfo[];
}

interface AssignmentGroup {
  unitName: string;
  region: string;
  period: string;
  trainingLocations: TrainingLocation[];
}

interface AddPopupTarget {
  unitScheduleId: number;
  date: string;
  locationName: string;
  trainingLocationId: number;
}

// --- Helper: Boolean Formatter ---
const formatBool = (val: unknown): string => (val ? 'O (보유/가능)' : 'X (미보유/불가)');
const formatTime = (dateStr: unknown): string => {
  if (!dateStr || typeof dateStr !== 'string') return '-';
  return dateStr.includes('T')
    ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : dateStr;
};

// --- 1. 강사 필드 설정 ---
const INSTRUCTOR_FIELD_CONFIG: FieldConfig[] = [
  { key: 'teamName', label: '소속 팀' },
  { key: 'category', label: '분류(직책)' },
  { key: 'phoneNumber', label: '연락처', format: (v) => (v as string) || '-' },
  { key: 'email', label: '이메일' },
  { key: 'address', label: '주소', isLong: true },
  { key: 'generation', label: '기수' },
  { key: 'isTeamLeader', label: '팀장 여부', format: (v) => (v ? '팀장' : '팀원') },
  { key: 'restrictedArea', label: '제한 지역', isLong: true },
  { key: 'virtues', label: '강의 가능 과목', isLong: true },

  {
    key: 'availableDates',
    label: '근무 가능일',
    isLong: true,
    format: (dates) => {
      const dateArray = dates as string[] | undefined;
      const count = Array.isArray(dateArray) ? dateArray.length : 0;
      return (
        <div className="flex flex-col gap-2 mt-1">
          <span className="text-xs text-blue-600 font-bold">총 {count}일 가능</span>
          <MiniCalendar availableDates={dateArray || []} />
        </div>
      );
    },
  },
];

// --- 2. 부대/교육장소 필드 설정 ---
const UNIT_FIELD_CONFIG: FieldConfig[] = [
  { key: 'unitName', label: '부대명' },
  { key: 'region', label: '지역' },
  { key: 'wideArea', label: '광역' },
  { key: 'address', label: '상세주소', isLong: true },

  { key: 'originalPlace', label: '교육장소(기존)' },
  { key: 'changedPlace', label: '교육장소(변경)' },
  { key: 'instructorsNumbers', label: '투입 강사 수', format: (v) => (v ? `${v}명` : '-') },
  { key: 'plannedCount', label: '계획 인원', format: (v) => (v ? `${v}명` : '-') },
  { key: 'actualCount', label: '실 참여 인원', format: (v) => (v ? `${v}명` : '-') },

  { key: 'officerName', label: '담당 간부명' },
  { key: 'officerPhone', label: '간부 연락처' },
  { key: 'officerEmail', label: '간부 이메일' },

  {
    key: 'educationStart',
    label: '교육 시작일',
    format: (v) => (typeof v === 'string' && v ? v.split('T')[0] : '-'),
  },
  {
    key: 'educationEnd',
    label: '교육 종료일',
    format: (v) => (typeof v === 'string' && v ? v.split('T')[0] : '-'),
  },
  { key: 'workStartTime', label: '근무 시작', format: formatTime },
  { key: 'workEndTime', label: '근무 종료', format: formatTime },
  { key: 'lunchStartTime', label: '점심 시작', format: formatTime },
  { key: 'lunchEndTime', label: '점심 종료', format: formatTime },

  { key: 'hasInstructorLounge', label: '강사 휴게실', format: formatBool },
  { key: 'hasWomenRestroom', label: '여자 화장실', format: formatBool },
  { key: 'hasCateredMeals', label: '수탁 급식', format: formatBool },
  { key: 'hasHallLodging', label: '회관 숙박', format: formatBool },
  { key: 'allowsPhoneBeforeAfter', label: '휴대폰 불출', format: formatBool },

  { key: 'note', label: '특이사항', isLong: true },
];

interface AssignmentDetailModalProps {
  item: Item | null;
  onClose: () => void;
}

export const AssignmentDetailModal: React.FC<AssignmentDetailModalProps> = ({ item, onClose }) => {
  const modalContent = useMemo<ModalContent | null>(() => {
    if (!item) return null;

    const isInstructor = item.type === 'INSTRUCTOR';

    const title = isInstructor ? `${item.name} 강사` : item.unitName || '';
    const subtitle = isInstructor
      ? `${item.teamName || '소속 미정'} | ${item.category || item.role || '직책 미정'}`
      : `${item.originalPlace || '교육장소 미정'} | ${item.date || ''}`;

    const config = isInstructor ? INSTRUCTOR_FIELD_CONFIG : UNIT_FIELD_CONFIG;

    const fields = config.map((field) => {
      let val = item[field.key];
      if (val === undefined && item.detail) {
        val = item.detail[field.key];
      }

      return {
        label: field.label,
        isLong: field.isLong,
        value: field.format ? field.format(val) : (val as ReactNode),
      };
    });

    return { title, subtitle, fields };
  }, [item]);

  if (!item || !modalContent) return null;

  return (
    <DetailModal
      isOpen={!!item}
      onClose={onClose}
      title={modalContent.title}
      subtitle={modalContent.subtitle}
      fields={modalContent.fields}
    />
  );
};

interface AssignmentGroupDetailModalProps {
  group: AssignmentGroup;
  onClose: () => void;
  onRemove?: (unitScheduleId: number, instructorId: number) => void;
  onAdd?: (
    unitScheduleId: number,
    instructorId: number,
    trainingLocationId: number | null,
  ) => Promise<void>;
  availableInstructors?: any[];
}

export const AssignmentGroupDetailModal: React.FC<AssignmentGroupDetailModalProps> = ({
  group,
  onClose,
  onRemove,
  onAdd,
  availableInstructors = [],
}) => {
  const [addPopupTarget, setAddPopupTarget] = useState<AddPopupTarget | null>(null);

  const [removeTarget, setRemoveTarget] = useState<{
    unitScheduleId: number;
    instructorId: number;
  } | null>(null);

  const confirmRemove = (): void => {
    if (removeTarget && onRemove) {
      onRemove(removeTarget.unitScheduleId, removeTarget.instructorId);
      logger.debug('Remove:', removeTarget.unitScheduleId, removeTarget.instructorId);
      // 모달은 열린 상태 유지 (부모의 fetchData로 데이터 갱신)
    }
    setRemoveTarget(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fadeInScale">
        {/* 1. Header */}
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              {group.unitName}
              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                {group.region}
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">📅 교육 기간: {group.period}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full"
          >
            ✕
          </button>
        </div>

        {/* 2. Body */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6">
          {group.trainingLocations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏫</span>
                  <h3 className="font-bold text-indigo-900">{loc.name}</h3>
                </div>
                {/* 총괄/책임강사 표시 */}
                {(() => {
                  const headInstructor = loc.dates
                    .flatMap((d) => d.instructors)
                    .find((i) => i.role === 'Head' || i.role === 'Supervisor');
                  if (headInstructor) {
                    return (
                      <div className="mt-1 text-sm text-gray-600">
                        {headInstructor.role === 'Head' ? '👑 총괄강사' : '📋 책임강사'}:{' '}
                        <span className="font-semibold text-gray-800">{headInstructor.name}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="divide-y divide-gray-100">
                {loc.dates.map((dateInfo) => (
                  <div
                    key={dateInfo.unitScheduleId}
                    className="p-4 flex flex-col md:flex-row md:items-center gap-4"
                  >
                    <div className="w-32 flex-shrink-0">
                      <div className="font-bold text-gray-700">{dateInfo.date}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        필요: {dateInfo.requiredCount}명
                      </div>
                    </div>

                    <div className="flex-1 flex flex-wrap gap-2 items-center">
                      {/* 카테고리 우선 정렬: Main > Co > Assistant > Practicum, 같은 카테고리 내 역할순 */}
                      {[...dateInfo.instructors]
                        .sort((a, b) => {
                          const categoryOrder: Record<string, number> = {
                            Main: 0,
                            Co: 1,
                            Assistant: 2,
                            Practicum: 3,
                          };
                          const aCat = categoryOrder[a.category ?? ''] ?? 4;
                          const bCat = categoryOrder[b.category ?? ''] ?? 4;
                          if (aCat !== bCat) return aCat - bCat;
                          // 같은 카테고리면 역할순
                          const roleOrder = { Head: 0, Supervisor: 1 };
                          const aRole = a.role
                            ? (roleOrder[a.role as keyof typeof roleOrder] ?? 2)
                            : 2;
                          const bRole = b.role
                            ? (roleOrder[b.role as keyof typeof roleOrder] ?? 2)
                            : 2;
                          if (aRole !== bRole) return aRole - bRole;
                          return a.instructorId - b.instructorId;
                        })
                        .map((inst) => (
                          <div
                            key={inst.instructorId}
                            className={`group relative flex items-center gap-2 border px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all ${
                              inst.role === 'Head'
                                ? 'bg-amber-50 border-amber-400 hover:border-amber-500'
                                : inst.role === 'Supervisor'
                                  ? 'bg-blue-50 border-blue-300 hover:border-blue-400'
                                  : 'bg-white border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-gray-800">{inst.name}</span>
                                {inst.role === 'Head' && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                                    총괄
                                  </span>
                                )}
                                {inst.role === 'Supervisor' && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded">
                                    책임
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500">{inst.team}</div>
                            </div>

                            <button
                              onClick={() =>
                                setRemoveTarget({
                                  unitScheduleId: dateInfo.unitScheduleId,
                                  instructorId: inst.instructorId,
                                })
                              }
                              className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                      <button
                        onClick={() =>
                          setAddPopupTarget({
                            unitScheduleId: dateInfo.unitScheduleId,
                            date: dateInfo.date,
                            locationName: loc.name,
                            trainingLocationId: loc.id,
                          })
                        }
                        className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 text-gray-400 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                        title="강사 추가"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-white p-4 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            닫기
          </Button>
        </div>
      </div>

      {/* 4. 강사 추가 팝업 */}
      {addPopupTarget && (
        <InstructorSelectionPopup
          target={addPopupTarget}
          allAvailableInstructors={availableInstructors}
          onClose={() => setAddPopupTarget(null)}
          onAdd={async (inst) => {
            if (!onAdd) return;
            await onAdd(addPopupTarget.unitScheduleId, inst.id, addPopupTarget.trainingLocationId);
          }}
        />
      )}
      {/* 5. 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!removeTarget}
        title="배정 제외"
        message="이 강사를 배정에서 제외하시겠습니까?"
        confirmText="제외"
        cancelText="취소"
        confirmVariant="danger"
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
};
