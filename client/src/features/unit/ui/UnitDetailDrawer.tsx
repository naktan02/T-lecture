// client/src/features/unit/ui/UnitDetailDrawer.tsx
import { useEffect, useMemo, useState, ChangeEvent, FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unitApi, UnitData } from '../api/unitApi';
import { Button, InputField } from '../../../shared/ui';
import { AddressSearchInput } from '../../../shared/ui/AddressSearchInput';

/**
 * ✅ 포인트
 * - initialUnit! (non-null assertion) 제거
 * - detailData의 data.data 구조를 타입으로 정리 (ApiResponse)
 * - updateLocation을 keyof TrainingLocation 기반으로 안전하게
 * - locations 숫자 입력은 폼에서는 string으로 관리 → submit 때 number로 변환
 */

// ---------- Types ----------
type UnitType = 'Army' | 'Navy' | 'AirForce' | 'Marines' | 'MND';

interface Schedule {
  id?: number;
  date: string; // YYYY-MM-DD (UI용)
  isExcluded: boolean; // 교육불가 여부
}

interface TrainingLocation {
  id?: number | null;
  originalPlace: string;
  changedPlace?: string;

  // 폼에서는 input 특성상 string으로 관리 (submit 때 number 변환)
  plannedCount: string;
  actualCount: string;
  instructorsNumbers?: string;

  hasInstructorLounge: boolean;
  hasWomenRestroom: boolean;
  hasCateredMeals: boolean;
  hasHallLodging: boolean;
  allowsPhoneBeforeAfter: boolean;

  note: string;
}

interface Unit {
  id: number;
  name?: string;
  unitType?: UnitType | string;
  region?: string;
  wideArea?: string;
  addressDetail?: string;

  officerName?: string;
  officerPhone?: string;
  officerEmail?: string;

  educationStart?: string; // ISO or date
  educationEnd?: string;

  workStartTime?: string; // ISO datetime
  workEndTime?: string;
  lunchStartTime?: string;
  lunchEndTime?: string;

  trainingLocations?: TrainingLocation[] | any[];
  schedules?: { id?: number; date?: string; isExcluded?: boolean }[] | any[];
}

// 서버 API 응답: { result: 'Success', data: Unit }
// useQuery의 data는 queryFn의 반환값 그대로
type ApiEnvelope<T> = { result?: string; data: T };

// 폼 데이터는 “입력값”만 관리
interface FormData {
  name: string;
  unitType: UnitType;
  region: string;
  wideArea: string;
  addressDetail: string;

  officerName: string;
  officerPhone: string;
  officerEmail: string;

  educationStart: string; // YYYY-MM-DD
  educationEnd: string; // YYYY-MM-DD
  workStartTime: string; // HH:mm
  workEndTime: string; // HH:mm
  lunchStartTime: string; // HH:mm
  lunchEndTime: string; // HH:mm
}

interface UnitDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit | null;

  // 프로젝트마다 시그니처 다를 수 있어서 “호출부와 동일하게” 최대한 유연하게 두되
  // payload 자체는 아래에서 깔끔하게 만든다.
  // 신규 등록과 수정을 각각 처리
  onRegister: (data: UnitData) => Promise<unknown> | void;
  onUpdate: (params: { id: number | string; data: unknown }) => void;
  onDelete: (id: number) => void;
}

// ---------- Helpers ----------
const toDateValue = (str?: string | null): string => {
  if (!str) return '';
  try {
    return new Date(str).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const toTimeValue = (str?: string | null): string => {
  if (!str) return '';
  try {
    return new Date(str).toTimeString().slice(0, 5); // HH:mm
  } catch {
    return '';
  }
};

const makeDateISO = (d: string): string | null => (d ? new Date(d).toISOString() : null);

const makeTimeISO = (t: string): string | null => {
  if (!t) return null;
  const d = new Date();
  const [h, m] = t.split(':');
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toISOString();
};

const toNumberOrNull = (v: string | undefined): number | null => {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const INITIAL_FORM: FormData = {
  name: '',
  unitType: 'Army',
  region: '',
  wideArea: '',
  addressDetail: '',

  officerName: '',
  officerPhone: '',
  officerEmail: '',

  educationStart: '',
  educationEnd: '',
  workStartTime: '',
  workEndTime: '',
  lunchStartTime: '',
  lunchEndTime: '',
};

const createEmptyLocation = (): TrainingLocation => ({
  id: null,
  originalPlace: '',
  changedPlace: '',
  plannedCount: '0',
  actualCount: '0',
  instructorsNumbers: '0',

  hasInstructorLounge: false,
  hasWomenRestroom: false,
  hasCateredMeals: false,
  hasHallLodging: false,
  allowsPhoneBeforeAfter: false,

  note: '',
});

// ---------- Component ----------
export const UnitDetailDrawer = ({
  isOpen,
  onClose,
  unit: initialUnit,
  onRegister,
  onUpdate,
  onDelete,
}: UnitDetailDrawerProps) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'location' | 'schedule'>('basic');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);

  const [locations, setLocations] = useState<TrainingLocation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  // 신규 등록 시 사용: 개별 교육불가일자 목록
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const [newExcludedDate, setNewExcludedDate] = useState('');

  const unitId = initialUnit?.id;

  // 1) 상세 데이터 API 조회
  // API 응답: { result: 'Success', data: unit }
  const { data: detailData, isSuccess } = useQuery<ApiEnvelope<Unit>>({
    queryKey: ['unitDetail', unitId],
    queryFn: () => unitApi.getUnit(unitId as number),
    enabled: Boolean(unitId) && isOpen,
    staleTime: 0,
  });

  // 2) 실제 바인딩 대상 Unit 결정
  // API 응답: { result: 'Success', data: unit }
  const boundUnit: Unit | null = useMemo(() => {
    if (!initialUnit) return null;
    const fromServer = detailData?.data;
    return fromServer ?? initialUnit;
  }, [initialUnit, detailData]);

  // 3) 바인딩
  useEffect(() => {
    if (!isOpen) return;

    if (!initialUnit) {
      // 신규 등록 모드
      setFormData({ ...INITIAL_FORM });
      setLocations([]);
      setSchedules([]);
      setExcludedDates([]);
      setNewExcludedDate('');
      setActiveTab('basic');
      return;
    }

    // 수정 모드
    const target = boundUnit ?? initialUnit;

    setFormData({
      name: target.name || '',
      unitType: (['Army', 'Navy', 'AirForce', 'Marines', 'MND'].includes(target.unitType as string)
        ? target.unitType
        : 'Army') as UnitType,
      region: target.region || '',
      wideArea: target.wideArea || '',
      addressDetail: target.addressDetail || '',

      officerName: target.officerName || '',
      officerPhone: target.officerPhone || '',
      officerEmail: target.officerEmail || '',

      educationStart: toDateValue(target.educationStart),
      educationEnd: toDateValue(target.educationEnd),
      workStartTime: toTimeValue(target.workStartTime),
      workEndTime: toTimeValue(target.workEndTime),
      lunchStartTime: toTimeValue(target.lunchStartTime),
      lunchEndTime: toTimeValue(target.lunchEndTime),
    });

    // locations
    if (Array.isArray(target.trainingLocations)) {
      // 서버가 number로 주더라도 UI에서는 string으로 정규화
      const normalized = target.trainingLocations.map(
        (loc: any): TrainingLocation => ({
          id: loc?.id ?? null,
          originalPlace: String(loc?.originalPlace ?? ''),
          changedPlace: String(loc?.changedPlace ?? ''),
          plannedCount: String(loc?.plannedCount ?? '0'),
          actualCount: String(loc?.actualCount ?? '0'),
          instructorsNumbers: String(loc?.instructorsNumbers ?? '0'),
          hasInstructorLounge: Boolean(loc?.hasInstructorLounge),
          hasWomenRestroom: Boolean(loc?.hasWomenRestroom),
          hasCateredMeals: Boolean(loc?.hasCateredMeals),
          hasHallLodging: Boolean(loc?.hasHallLodging),
          allowsPhoneBeforeAfter: Boolean(loc?.allowsPhoneBeforeAfter),
          note: String(loc?.note ?? ''),
        }),
      );
      setLocations(normalized);
    } else {
      setLocations([]);
    }

    // schedules (isExcluded 포함)
    if (Array.isArray(target.schedules)) {
      const schedulesNormalized = target.schedules.map((s: any) => ({
        id: s?.id,
        date: toDateValue(s?.date),
        isExcluded: Boolean(s?.isExcluded),
      }));
      setSchedules(schedulesNormalized);

      // excludedDates도 schedules에서 추출하여 설정 (isExcluded가 true인 날짜들)
      const excluded = schedulesNormalized.filter((s) => s.isExcluded && s.date).map((s) => s.date);
      setExcludedDates(excluded);
    } else {
      setSchedules([]);
      setExcludedDates([]);
    }

    setActiveTab('basic');
  }, [isOpen, initialUnit, boundUnit, isSuccess]);

  // ---------- Handlers ----------
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 주소 검색 완료 핸들러
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddressSelect = (data: any) => {
    setFormData((prev) => ({
      ...prev,
      wideArea: data.sido || '',
      region: data.sigungu || '',
      addressDetail: data.roadAddress || data.jibunAddress || '',
    }));
  };

  // schedules - isExcluded 토글
  const toggleScheduleExcluded = (idx: number) => {
    setSchedules((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], isExcluded: !n[idx].isExcluded };
      return n;
    });
  };

  // locations
  const addLocation = () => setLocations((prev) => [...prev, createEmptyLocation()]);

  const updateLocation = <K extends keyof TrainingLocation>(
    i: number,
    f: K,
    v: TrainingLocation[K],
  ) => {
    setLocations((prev) => {
      const n = [...prev];
      n[i] = { ...n[i], [f]: v };
      return n;
    });
  };

  const removeLocation = (i: number) => setLocations((prev) => prev.filter((_, idx) => idx !== i));

  // submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const required: (keyof FormData)[] = [
      'name',
      'educationStart',
      'educationEnd',
      'workStartTime',
      'workEndTime',
      'officerName',
    ];
    if (required.some((f) => !formData[f])) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    // 서버로 보낼 locations 정규화 (숫자 필드는 number로 변환)
    const locationsPayload = locations.map((loc) => ({
      ...loc,
      plannedCount: toNumberOrNull(loc.plannedCount) ?? 0,
      actualCount: toNumberOrNull(loc.actualCount) ?? 0,
      instructorsNumbers: toNumberOrNull(loc.instructorsNumbers) ?? 0,
    }));

    const payload = {
      ...formData,
      educationStart: makeDateISO(formData.educationStart),
      educationEnd: makeDateISO(formData.educationEnd),
      // excludedDates는 항상 전송하여 일정 재계산 가능하게 함
      excludedDates: excludedDates,
      workStartTime: makeTimeISO(formData.workStartTime),
      workEndTime: makeTimeISO(formData.workEndTime),
      lunchStartTime: makeTimeISO(formData.lunchStartTime),
      lunchEndTime: makeTimeISO(formData.lunchEndTime),

      trainingLocations: locationsPayload,

      // 수정 모드에서도 schedules를 보내되, excludedDates가 있으면 서버에서 재계산됨
      schedules: schedules
        .filter((s) => s.date)
        .map((s) => ({
          id: s.id,
          date: makeDateISO(s.date),
          isExcluded: s.isExcluded,
        })),
    };

    try {
      if (initialUnit) {
        onUpdate({ id: initialUnit.id, data: payload });
      } else {
        await onRegister(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('저장 실패');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 z-50 w-full md:w-[800px] bg-white shadow-2xl flex flex-col">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            {/* 모바일 뒤로가기 */}
            <button
              onClick={onClose}
              className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-lg md:text-xl font-bold">
              {initialUnit ? '부대 정보 수정' : '신규 부대 등록'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="hidden md:flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex border-b bg-gray-50 shrink-0 overflow-x-auto">
          {(['basic', 'location', 'schedule'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[100px] py-3 px-4 font-medium text-sm md:text-base border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-green-500 text-green-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'basic'
                ? '기본 정보'
                : tab === 'location'
                  ? `교육장소 (${locations.length})`
                  : `일정 (${schedules.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form id="unit-form" onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">🏢 기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="부대명 *"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />

                    <div>
                      <label className="text-sm font-medium">군 구분 *</label>
                      <select
                        name="unitType"
                        value={formData.unitType}
                        onChange={handleChange}
                        className="w-full mt-1 p-2 border rounded-lg"
                      >
                        <option value="Army">육군</option>
                        <option value="Navy">해군</option>
                        <option value="AirForce">공군</option>
                        <option value="Marines">해병대</option>
                        <option value="MND">국직부대</option>
                      </select>
                    </div>

                    <InputField
                      label="광역"
                      name="wideArea"
                      value={formData.wideArea}
                      onChange={handleChange}
                    />
                    <InputField
                      label="지역"
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                    />
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">상세주소</label>
                      <AddressSearchInput
                        value={formData.addressDetail}
                        onChange={(val) => setFormData((prev) => ({ ...prev, addressDetail: val }))}
                        onSelect={handleAddressSelect}
                        placeholder="주소 검색을 클릭하여 주소를 입력하세요"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">⏰ 일정 관리</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      type="date"
                      label="교육 시작 *"
                      name="educationStart"
                      value={formData.educationStart}
                      onChange={handleChange}
                      required
                    />
                    <InputField
                      type="date"
                      label="교육 종료 *"
                      name="educationEnd"
                      value={formData.educationEnd}
                      onChange={handleChange}
                      required
                    />

                    <div className="col-span-2">
                      <label className="text-sm font-medium">
                        교육불가일자 ({excludedDates.length}개)
                      </label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="date"
                          value={newExcludedDate}
                          onChange={(e) => setNewExcludedDate(e.target.value)}
                          className="flex-1 p-2 border rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newExcludedDate && !excludedDates.includes(newExcludedDate)) {
                              setExcludedDates((prev) => [...prev, newExcludedDate].sort());
                              setNewExcludedDate('');
                            }
                          }}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm"
                        >
                          추가
                        </button>
                      </div>
                      {excludedDates.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {excludedDates.map((date) => (
                            <span
                              key={date}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-sm"
                            >
                              {date}
                              <button
                                type="button"
                                onClick={() =>
                                  setExcludedDates((prev) => prev.filter((d) => d !== date))
                                }
                                className="text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="col-span-2 border-t my-2" />

                    <InputField
                      type="time"
                      label="근무 시작 *"
                      name="workStartTime"
                      value={formData.workStartTime}
                      onChange={handleChange}
                      required
                    />
                    <InputField
                      type="time"
                      label="근무 종료 *"
                      name="workEndTime"
                      value={formData.workEndTime}
                      onChange={handleChange}
                      required
                    />
                    <InputField
                      type="time"
                      label="점심 시작"
                      name="lunchStartTime"
                      value={formData.lunchStartTime}
                      onChange={handleChange}
                    />
                    <InputField
                      type="time"
                      label="점심 종료"
                      name="lunchEndTime"
                      value={formData.lunchEndTime}
                      onChange={handleChange}
                    />
                  </div>
                </section>

                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">📞 담당자</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="이름 *"
                      name="officerName"
                      value={formData.officerName}
                      onChange={handleChange}
                      required
                    />
                    <InputField
                      label="연락처 *"
                      name="officerPhone"
                      value={formData.officerPhone}
                      onChange={handleChange}
                      required
                    />
                    <div className="col-span-2">
                      <InputField
                        label="이메일"
                        name="officerEmail"
                        value={formData.officerEmail}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="flex justify-between mb-4">
                  <Button type="button" onClick={addLocation} size="small">
                    + 장소 추가
                  </Button>
                </div>

                {locations.map((loc, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border shadow-sm relative">
                    <button
                      type="button"
                      onClick={() => removeLocation(idx)}
                      className="absolute top-4 right-4 text-red-500 font-bold"
                    >
                      삭제
                    </button>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <InputField
                        label="기존 장소"
                        value={loc.originalPlace}
                        onChange={(e) => updateLocation(idx, 'originalPlace', e.target.value)}
                      />
                      <InputField
                        label="변경 장소"
                        value={loc.changedPlace ?? ''}
                        onChange={(e) => updateLocation(idx, 'changedPlace', e.target.value)}
                      />
                      <InputField
                        type="number"
                        label="계획인원"
                        value={loc.plannedCount}
                        onChange={(e) => updateLocation(idx, 'plannedCount', e.target.value)}
                      />
                      <InputField
                        type="number"
                        label="참여인원"
                        value={loc.actualCount}
                        onChange={(e) => updateLocation(idx, 'actualCount', e.target.value)}
                      />
                      <InputField
                        type="number"
                        label="강사 수"
                        value={loc.instructorsNumbers ?? ''}
                        onChange={(e) => updateLocation(idx, 'instructorsNumbers', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-gray-50 p-3 rounded mb-3">
                      {(
                        [
                          { k: 'hasInstructorLounge', l: '강사대기실' },
                          { k: 'hasWomenRestroom', l: '여자화장실' },
                          { k: 'hasCateredMeals', l: '수탁급식' },
                          { k: 'hasHallLodging', l: '회관숙박' },
                          { k: 'allowsPhoneBeforeAfter', l: '휴대폰불출' },
                        ] as const
                      ).map((o) => (
                        <label key={o.k} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={loc[o.k]}
                            onChange={(e) => updateLocation(idx, o.k, e.target.checked)}
                          />
                          {o.l}
                        </label>
                      ))}
                    </div>

                    <InputField
                      label="비고"
                      value={loc.note}
                      onChange={(e) => updateLocation(idx, 'note', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-4">
                {schedules.length > 0 ? (
                  <>
                    <div className="bg-blue-50 p-3 rounded text-center text-sm text-blue-800 mb-4">
                      <b>📅 등록된 교육 일정 ({schedules.filter((s) => !s.isExcluded).length}일)</b>
                      <br />
                      <span className="text-red-600">
                        🚫 교육불가: {schedules.filter((s) => s.isExcluded).length}일
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {schedules.map((sch, idx) => (
                        <div
                          key={idx}
                          className={`border p-3 rounded text-center shadow-sm cursor-pointer transition-colors ${
                            sch.isExcluded
                              ? 'bg-red-50 border-red-300'
                              : 'bg-white hover:bg-blue-50'
                          }`}
                          onClick={() => toggleScheduleExcluded(idx)}
                        >
                          <div className="text-xs text-gray-400 mb-1">{idx + 1}일차</div>
                          <div
                            className={`font-bold ${sch.isExcluded ? 'text-red-500 line-through' : ''}`}
                          >
                            {sch.date}
                          </div>
                          <div className="text-xs mt-1">
                            {sch.isExcluded ? '🚫 교육불가' : '✅ 교육가능'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-10 text-center text-gray-400 border border-dashed rounded bg-gray-50">
                    <p className="mb-2">등록된 일정이 없습니다.</p>
                    <p className="text-xs">
                      상세 데이터를 불러오는 중이거나, 일정이 생성되지 않았습니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t bg-white flex justify-between shrink-0">
          {initialUnit && (
            <button type="button" onClick={() => onDelete(initialUnit.id)} className="text-red-500">
              삭제
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <button
              type="submit"
              form="unit-form"
              className="px-5 py-2 bg-green-600 text-white rounded font-medium"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
