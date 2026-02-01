// src/features/assignment/ui/AssignmentDetailModal.tsx

import { useMemo, useState, ReactNode, useCallback } from 'react';
import { DetailModal, MiniCalendar, Button, ConfirmModal } from '../../../shared/ui';
import { InstructorSelectionPopup } from './InstructorSelectionPopup';
import { logger, showSuccess, showError } from '../../../shared/utils';
import { AssignmentChangeSet, batchUpdateAssignmentsApi } from '../assignmentApi';

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
  state?: string | null; // Pending, Accepted, Rejected (null = unsent)
}

interface RejectedInstructor {
  instructorId: number;
  name: string;
  team: string;
  category?: string | null;
}

interface DateInfo {
  unitScheduleId: number;
  date: string;
  requiredCount: number;
  actualCount?: number;
  instructors: Instructor[];
  rejectedInstructors?: RejectedInstructor[];
}

interface TrainingLocation {
  id: number;
  name: string;
  actualCount: number;
  dates: DateInfo[];
}

interface AssignmentGroup {
  unitId: number;
  unitName: string;
  region: string;
  period: string;
  trainingLocations: TrainingLocation[];
  isStaffLocked?: boolean;
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
  zIndex?: number;
}

export const AssignmentDetailModal: React.FC<AssignmentDetailModalProps> = ({
  item,
  onClose,
  zIndex,
}) => {
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
      zIndex={zIndex}
    />
  );
};

interface AssignmentGroupDetailModalProps {
  group: AssignmentGroup;
  onClose: () => void;
  onSaveComplete?: () => Promise<void>;
  availableInstructors?: {
    id: number;
    name: string;
    team: string;
    teamName?: string;
    category?: string;
    availableDates?: string[];
  }[];
  allInstructors?: {
    id: number;
    name: string;
    team: string;
    teamName?: string;
    category?: string;
    availableDates?: string[];
  }[]; // 전체 강사 목록 (전체 검색용)
  assignedByDate?: Map<string, Set<number>>; // 날짜별 이미 배정된 강사 ID
  // 거리 필터링용 데이터
  distanceMap?: Record<string, number>; // `${instructorId}-${unitId}` → km
  distanceLimits?: {
    internMaxDistanceKm: number;
    subMaxDistanceKm: number | null;
  } | null;
}

export const AssignmentGroupDetailModal: React.FC<AssignmentGroupDetailModalProps> = ({
  group,
  onClose,
  onSaveComplete,
  availableInstructors = [],
  allInstructors = [],
  assignedByDate = new Map(),
  distanceMap = {},
  distanceLimits = null,
}) => {
  const [addPopupTarget, setAddPopupTarget] = useState<AddPopupTarget | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    unitScheduleId: number;
    instructorId: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 강사 상세정보 모달 상태
  const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(null);

  // 로컬 변경 상태 추적
  const [changeSet, setChangeSet] = useState<AssignmentChangeSet>({
    add: [],
    remove: [],
    roleChanges: [],
    staffLockChanges: [],
    stateChanges: [],
  });

  // 역할 선택 드롭다운 표시 상태
  const [showRoleSelector, setShowRoleSelector] = useState<number | null>(null);

  // 변경사항 있는지 확인
  const hasChanges = useMemo(() => {
    return (
      changeSet.add.length > 0 ||
      changeSet.remove.length > 0 ||
      changeSet.roleChanges.length > 0 ||
      changeSet.staffLockChanges.length > 0 ||
      changeSet.stateChanges.length > 0
    );
  }, [changeSet]);

  // 로컬에서 삭제된 강사인지 확인
  const isRemovedLocally = useCallback(
    (unitScheduleId: number, instructorId: number) => {
      return changeSet.remove.some(
        (r) => r.unitScheduleId === unitScheduleId && r.instructorId === instructorId,
      );
    },
    [changeSet.remove],
  );

  // 로컬에서 추가된 강사 목록 가져오기 (trainingLocationId도 확인)
  const getLocallyAddedInstructors = useCallback(
    (unitScheduleId: number, trainingLocationId: number) => {
      return changeSet.add
        .filter(
          (a) => a.unitScheduleId === unitScheduleId && a.trainingLocationId === trainingLocationId,
        )
        .map((a) => {
          const instructor = availableInstructors.find((i) => i.id === a.instructorId);
          return instructor
            ? {
                instructorId: a.instructorId,
                name: instructor.name,
                team: instructor.team,
                isLocalAdd: true,
              }
            : null;
        })
        .filter(Boolean) as {
        instructorId: number;
        name: string;
        team: string;
        isLocalAdd: boolean;
      }[];
    },
    [changeSet.add, availableInstructors],
  );

  // 해당 스케줄에 이미 배정된 강사 ID 목록 계산
  const getAssignedInstructorIds = useCallback(
    (unitScheduleId: number) => {
      const fromServer = group.trainingLocations
        .flatMap((loc) => loc.dates)
        .filter((d) => d.unitScheduleId === unitScheduleId)
        .flatMap((d) => d.instructors.map((i) => i.instructorId));

      // 로컬에서 추가된 강사
      const addedLocally = changeSet.add
        .filter((a) => a.unitScheduleId === unitScheduleId)
        .map((a) => a.instructorId);

      // 로컬에서 삭제된 강사
      const removedLocally = changeSet.remove
        .filter((r) => r.unitScheduleId === unitScheduleId)
        .map((r) => r.instructorId);

      // 서버 데이터 + 로컬 추가 - 로컬 삭제
      return [...fromServer, ...addedLocally].filter((id) => !removedLocally.includes(id));
    },
    [group.trainingLocations, changeSet.add, changeSet.remove],
  );

  // 강사 추가 (로컬)
  const handleAddLocal = useCallback(
    (unitScheduleId: number, instructorId: number, trainingLocationId: number | null) => {
      setChangeSet((prev) => ({
        ...prev,
        add: [...prev.add, { unitScheduleId, instructorId, trainingLocationId }],
      }));
    },
    [],
  );

  // 강사 삭제 (로컬)
  const handleRemoveLocal = useCallback((unitScheduleId: number, instructorId: number) => {
    setChangeSet((prev) => ({
      ...prev,
      remove: [...prev.remove, { unitScheduleId, instructorId }],
    }));
  }, []);

  // 배정 확정 (로컬) - Pending → Accepted
  const handleConfirmLocal = useCallback((unitScheduleId: number, instructorId: number) => {
    setChangeSet((prev) => ({
      ...prev,
      stateChanges: [
        ...prev.stateChanges,
        { unitScheduleId, instructorId, state: 'Accepted' as const },
      ],
    }));
  }, []);

  // 이 강사가 로컬에서 확정 대기 상태인지 확인
  const isLocallyConfirmed = useCallback(
    (unitScheduleId: number, instructorId: number): boolean => {
      return changeSet.stateChanges.some(
        (sc) =>
          sc.unitScheduleId === unitScheduleId &&
          sc.instructorId === instructorId &&
          sc.state === 'Accepted',
      );
    },
    [changeSet.stateChanges],
  );

  // 역할 변경 (로컬)
  const handleRoleChange = useCallback(
    (instructorId: number, role: 'Head' | 'Supervisor' | null) => {
      setChangeSet((prev) => {
        // 같은 부대에 대한 기존 roleChange 제거 후 새로 추가
        const filtered = prev.roleChanges.filter((rc) => rc.unitId !== group.unitId);
        return {
          ...prev,
          roleChanges: [...filtered, { unitId: group.unitId, instructorId, role }],
        };
      });
      setShowRoleSelector(null);
    },
    [group.unitId],
  );

  // 현재 역할 가져오기 (로컬 변경 우선)
  const getCurrentRole = useCallback(
    (instructorId: number, serverRole: string | null | undefined): string | null => {
      const localChange = changeSet.roleChanges.find((rc) => rc.unitId === group.unitId);
      if (localChange) {
        return localChange.instructorId === instructorId ? localChange.role : null;
      }
      return serverRole ?? null;
    },
    [changeSet.roleChanges, group.unitId],
  );

  // 모든 배정 강사 목록 (중복 제거)
  const allAssignedInstructors = useMemo(() => {
    const map = new Map<
      number,
      { instructorId: number; name: string; team: string; role?: string | null }
    >();
    group.trainingLocations.forEach((loc) => {
      loc.dates.forEach((d) => {
        d.instructors.forEach((inst) => {
          if (!isRemovedLocally(d.unitScheduleId, inst.instructorId)) {
            if (!map.has(inst.instructorId)) {
              map.set(inst.instructorId, {
                instructorId: inst.instructorId,
                name: inst.name,
                team: inst.team,
                role: inst.role,
              });
            }
          }
        });
      });
    });
    return Array.from(map.values());
  }, [group.trainingLocations, isRemovedLocally]);

  // 저장 처리
  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      const result = await batchUpdateAssignmentsApi(changeSet);
      const msgs: string[] = [];
      if (result.added > 0) msgs.push(`추가 ${result.added}`);
      if (result.removed > 0) msgs.push(`삭제 ${result.removed}`);
      if (result.rolesUpdated > 0) msgs.push(`역할 변경 ${result.rolesUpdated}`);
      if (result.staffLocksUpdated > 0) msgs.push(`인원고정 ${result.staffLocksUpdated}`);
      if (result.statesUpdated > 0) msgs.push(`확정 ${result.statesUpdated}`);
      showSuccess(msgs.length > 0 ? `저장 완료: ${msgs.join(', ')}` : '저장 완료');
      setChangeSet({
        add: [],
        remove: [],
        roleChanges: [],
        staffLockChanges: [],
        stateChanges: [],
      });
      if (onSaveComplete) await onSaveComplete();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmRemove = (): void => {
    if (removeTarget) {
      handleRemoveLocal(removeTarget.unitScheduleId, removeTarget.instructorId);
      logger.debug('Remove (local):', removeTarget.unitScheduleId, removeTarget.instructorId);
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
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-gray-500">📅 교육 기간: {group.period}</p>
              {/* 범례 */}
              <div className="flex items-center gap-3 text-[10px] ml-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>미발송
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>대기중
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>수락
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>거절
                </span>
                {/* 인원고정 체크박스 */}
                <label className="ml-4 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(() => {
                      // 로컬 변경 우선.
                      const localChange = changeSet.staffLockChanges.find(
                        (slc) => slc.unitId === group.unitId,
                      );
                      if (localChange !== undefined) {
                        return localChange.isStaffLocked;
                      }
                      // 로컬 변경 없으면 서버 값 사용
                      return group.isStaffLocked ?? false;
                    })()}
                    onChange={(e) => {
                      setChangeSet((prev) => ({
                        ...prev,
                        staffLockChanges: [
                          ...prev.staffLockChanges.filter((slc) => slc.unitId !== group.unitId),
                          { unitId: group.unitId, isStaffLocked: e.target.checked },
                        ],
                      }));
                    }}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-gray-600">🔒 인원고정</span>
                </label>
              </div>
            </div>
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
                {/* 총괄/책임강사 + 거절 강사 표시 */}
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  {/* 총괄/책임강사 클릭 가능 영역 */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowRoleSelector(showRoleSelector === loc.id ? null : loc.id)
                      }
                      className="text-sm text-gray-600 hover:bg-indigo-100 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {(() => {
                        // 로컬 변경 우선 확인
                        const localChange = changeSet.roleChanges.find(
                          (rc) => rc.unitId === group.unitId,
                        );
                        if (localChange) {
                          const changedInst = allAssignedInstructors.find(
                            (i) => i.instructorId === localChange.instructorId,
                          );
                          if (changedInst && localChange.role) {
                            return (
                              <>
                                {localChange.role === 'Head' ? '👑 총괄강사' : '📋 책임강사'}:
                                <span className="font-semibold text-gray-800">
                                  {changedInst.name}
                                </span>
                                <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1 rounded">
                                  변경됨
                                </span>
                              </>
                            );
                          }
                          return <span className="text-gray-400">역할 없음 (변경 대기)</span>;
                        }
                        // 서버 데이터 확인
                        const headInstructor = loc.dates
                          .flatMap((d) => d.instructors)
                          .find((i) => i.role === 'Head' || i.role === 'Supervisor');
                        if (headInstructor) {
                          return (
                            <>
                              {headInstructor.role === 'Head' ? '👑 총괄강사' : '📋 책임강사'}:
                              <span className="font-semibold text-gray-800">
                                {headInstructor.name}
                              </span>
                            </>
                          );
                        }
                        return <span className="text-gray-400">클릭하여 역할 지정</span>;
                      })()}
                      <span className="text-gray-400 text-xs">▼</span>
                    </button>

                    {/* 드롭다운 목록 - 이름만 표시, 클릭 시 총괄강사로 지정 */}
                    {showRoleSelector === loc.id && (
                      <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                        <div className="text-xs text-gray-500 px-3 py-1 border-b border-gray-100">
                          총괄강사로 지정할 강사 선택
                        </div>
                        {allAssignedInstructors.map((inst) => {
                          const isCurrentHead =
                            getCurrentRole(inst.instructorId, inst.role) === 'Head';
                          return (
                            <button
                              key={inst.instructorId}
                              type="button"
                              onClick={() => handleRoleChange(inst.instructorId, 'Head')}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors flex items-center justify-between ${
                                isCurrentHead ? 'bg-amber-50' : ''
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">{inst.name}</span>
                                <span className="text-[10px] text-gray-500">{inst.team}</span>
                              </span>
                              {isCurrentHead && (
                                <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded">
                                  현재
                                </span>
                              )}
                            </button>
                          );
                        })}
                        {allAssignedInstructors.length === 0 && (
                          <div className="text-xs text-gray-400 px-3 py-2">
                            배정된 강사가 없습니다
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 거절 강사 표시 (중복 제거) */}
                  {(() => {
                    const rejectedMap = new Map<
                      number,
                      { name: string; category?: string | null; team: string }
                    >();
                    loc.dates.forEach((d) => {
                      (d.rejectedInstructors || []).forEach((rej) => {
                        if (!rejectedMap.has(rej.instructorId)) {
                          rejectedMap.set(rej.instructorId, rej);
                        }
                      });
                    });
                    const rejectedList = Array.from(rejectedMap.values());
                    if (rejectedList.length === 0) return null;
                    return (
                      <div className="flex items-center gap-1 text-[11px] text-gray-600">
                        <span className="text-red-400">✕ 거절:</span>
                        {rejectedList.map((rej, idx) => (
                          <span
                            key={idx}
                            className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded"
                          >
                            {rej.name}
                            {rej.category && (
                              <span className="text-gray-500">
                                (
                                {rej.category === 'Main'
                                  ? '주'
                                  : rej.category === 'Co'
                                    ? '부'
                                    : rej.category === 'Assistant'
                                      ? '보조'
                                      : '실습'}
                                )
                              </span>
                            )}
                            <span className="text-gray-500">({rej.team})</span>
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {loc.dates.map((dateInfo) => (
                  <div
                    key={dateInfo.unitScheduleId}
                    className="p-4 flex flex-col md:flex-row md:items-center gap-4"
                  >
                    <div className="w-32 flex-shrink-0">
                      <div className="font-bold text-gray-700">{dateInfo.date}</div>
                      <div className="text-xs text-gray-400 mt-1 flex flex-col gap-0.5">
                        {dateInfo.actualCount ? <span>참여: {dateInfo.actualCount}명</span> : null}
                        <span>필요: {dateInfo.requiredCount}명</span>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-wrap gap-2 items-center">
                      {/* 카테고리 우선 정렬 + 로컬 삭제 필터링 */}
                      {[...dateInfo.instructors]
                        .filter(
                          (inst) => !isRemovedLocally(dateInfo.unitScheduleId, inst.instructorId),
                        )
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
                            onClick={() => setSelectedInstructorId(inst.instructorId)}
                            className={`group relative flex items-center gap-2 border px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer ${
                              inst.state === 'Rejected'
                                ? 'bg-gray-100 border-gray-300 opacity-60'
                                : inst.role === 'Head'
                                  ? 'bg-amber-50 border-amber-400 hover:border-amber-500'
                                  : inst.role === 'Supervisor'
                                    ? 'bg-blue-50 border-blue-300 hover:border-blue-400'
                                    : 'bg-white border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-gray-800">{inst.name}</span>
                                {/* 직책 라벨 (주/부/보조/실습) */}
                                {inst.category && (
                                  <span
                                    className={`px-1 py-0.5 text-[9px] font-bold rounded ${
                                      inst.category === 'Main'
                                        ? 'bg-purple-500 text-white'
                                        : inst.category === 'Co'
                                          ? 'bg-indigo-400 text-white'
                                          : inst.category === 'Assistant'
                                            ? 'bg-teal-400 text-white'
                                            : 'bg-gray-400 text-white'
                                    }`}
                                  >
                                    {inst.category === 'Main'
                                      ? '주'
                                      : inst.category === 'Co'
                                        ? '부'
                                        : inst.category === 'Assistant'
                                          ? '보조'
                                          : '실습'}
                                  </span>
                                )}
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
                              {/* 팀명 + 거리 */}
                              {(() => {
                                const distKey = `${inst.instructorId}-${group.unitId}`;
                                const distKm = distanceMap[distKey];
                                const distText =
                                  distKm !== undefined ? `${distKm.toFixed(1)}km` : '거리없음';
                                return (
                                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                    <span>{inst.team}</span>
                                    <span
                                      className={
                                        distKm !== undefined ? 'text-blue-600' : 'text-gray-400'
                                      }
                                    >
                                      📍 {distText}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* 상태 점 표시 */}
                            <span
                              className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${
                                isLocallyConfirmed(dateInfo.unitScheduleId, inst.instructorId)
                                  ? 'bg-green-500 ring-2 ring-green-300' // 로컬 확정 대기
                                  : !(inst as { messageSent?: boolean }).messageSent
                                    ? 'bg-blue-500' // 미발송
                                    : inst.state === 'Accepted'
                                      ? 'bg-green-500'
                                      : inst.state === 'Rejected'
                                        ? 'bg-red-500'
                                        : 'bg-yellow-400' // Pending (발송됨 but 대기중)
                              }`}
                              title={
                                isLocallyConfirmed(dateInfo.unitScheduleId, inst.instructorId)
                                  ? '확정 대기 (저장 필요)'
                                  : !(inst as { messageSent?: boolean }).messageSent
                                    ? '미발송'
                                    : inst.state === 'Accepted'
                                      ? '수락'
                                      : inst.state === 'Rejected'
                                        ? '거절'
                                        : '대기중'
                              }
                            />

                            {/* ✓ 확정 버튼 (Pending 상태이고 메시지 발송됨이고 아직 로컬 확정 안됐을 때만) */}
                            {(inst as { messageSent?: boolean }).messageSent &&
                              inst.state === 'Pending' &&
                              !isLocallyConfirmed(dateInfo.unitScheduleId, inst.instructorId) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmLocal(dateInfo.unitScheduleId, inst.instructorId);
                                  }}
                                  className="absolute -top-2 right-4 bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-green-600"
                                  title="확정 처리"
                                >
                                  ✓
                                </button>
                              )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRemoveTarget({
                                  unitScheduleId: dateInfo.unitScheduleId,
                                  instructorId: inst.instructorId,
                                });
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                      {/* 로컬에서 추가된 강사 표시 (하이라이트 스타일) */}
                      {getLocallyAddedInstructors(dateInfo.unitScheduleId, loc.id).map((inst) => (
                        <div
                          key={`local-add-${inst.instructorId}`}
                          className="group relative flex items-center gap-2 border-2 border-dashed border-indigo-400 bg-indigo-50 px-3 py-1.5 rounded-lg shadow-sm"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-indigo-700">{inst.name}</span>
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded">
                                저장 대기
                              </span>
                            </div>
                            {/* 팀명 + 거리 */}
                            {(() => {
                              const distKey = `${inst.instructorId}-${group.unitId}`;
                              const distKm = distanceMap[distKey];
                              const distText =
                                distKm !== undefined ? `${distKm.toFixed(1)}km` : '거리없음';
                              return (
                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                  <span>{inst.team}</span>
                                  <span
                                    className={
                                      distKm !== undefined ? 'text-blue-600' : 'text-gray-400'
                                    }
                                  >
                                    📍 {distText}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                          {/* X 버튼 */}
                          <button
                            onClick={() => {
                              // 로컬 추가에서 제거
                              setChangeSet((prev) => ({
                                ...prev,
                                add: prev.add.filter(
                                  (a) =>
                                    !(
                                      a.unitScheduleId === dateInfo.unitScheduleId &&
                                      a.instructorId === inst.instructorId
                                    ),
                                ),
                              }));
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                            title="추가 취소"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      {/* 인원고정 시 잠금 표시 또는 + 버튼 */}
                      {(() => {
                        // 인원고정 상태 확인 (로컬 변경 우선, 없으면 서버 값)
                        const localChange = changeSet.staffLockChanges.find(
                          (slc) => slc.unitId === group.unitId,
                        );
                        const isStaffLocked =
                          localChange !== undefined
                            ? localChange.isStaffLocked
                            : (group.isStaffLocked ?? false);

                        if (isStaffLocked) {
                          return (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 border-2 border-gray-300 text-gray-400"
                              title="인원고정 - 추가 불가"
                            >
                              🔒
                            </div>
                          );
                        }

                        return (
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
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-white p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {hasChanges && (
              <span className="text-indigo-600 font-medium">
                📝 변경 대기: 추가 {changeSet.add.length}, 삭제 {changeSet.remove.length}
                {changeSet.stateChanges.length > 0 && `, 확정 ${changeSet.stateChanges.length}`}
                {changeSet.staffLockChanges.length > 0 &&
                  `, 인원고정 ${changeSet.staffLockChanges.length}`}
                {changeSet.roleChanges.length > 0 && `, 역할 ${changeSet.roleChanges.length}`}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="secondary">
              닫기
            </Button>
            {hasChanges && (
              <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                {isSaving
                  ? '저장 중...'
                  : `저장 (${changeSet.add.length + changeSet.remove.length + changeSet.stateChanges.length + changeSet.staffLockChanges.length + changeSet.roleChanges.length}건)`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4. 강사 추가 팝업 */}
      {addPopupTarget && (
        <InstructorSelectionPopup
          target={{ ...addPopupTarget, unitId: group.unitId }}
          allAvailableInstructors={availableInstructors}
          allInstructors={allInstructors}
          assignedInstructorIds={[
            ...getAssignedInstructorIds(addPopupTarget.unitScheduleId),
            ...(assignedByDate.get(addPopupTarget.date) || []),
          ]}
          distanceMap={distanceMap}
          distanceLimits={distanceLimits}
          onClose={() => setAddPopupTarget(null)}
          onAdd={async (inst) => {
            handleAddLocal(
              addPopupTarget.unitScheduleId,
              inst.id,
              addPopupTarget.trainingLocationId,
            );
            setAddPopupTarget(null);
          }}
          onInstructorClick={(instructorId) => setSelectedInstructorId(instructorId)}
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

      {/* 6. 강사 상세정보 모달 */}
      {selectedInstructorId &&
        (() => {
          // 배정된 강사 목록에서 찾기
          const inst = group.trainingLocations
            .flatMap((loc) => loc.dates)
            .flatMap((d) => d.instructors)
            .find((i) => i.instructorId === selectedInstructorId);
          // 가용강사 목록에서 상세 데이터 찾기
          const detail = availableInstructors.find((i) => i.id === selectedInstructorId);
          if (!inst && !detail) return null;
          return (
            <AssignmentDetailModal
              item={
                {
                  type: 'INSTRUCTOR',
                  name: inst?.name || detail?.name || '',
                  teamName: inst?.team || detail?.teamName || detail?.team || '',
                  category: inst?.category || detail?.category || '',
                  ...detail,
                } as Item
              }
              onClose={() => setSelectedInstructorId(null)}
              zIndex={70}
            />
          );
        })()}
    </div>
  );
};
