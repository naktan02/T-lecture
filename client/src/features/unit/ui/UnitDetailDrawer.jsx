// client/src/features/unit/ui/UnitDetailDrawer.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unitApi } from '../api/unitApi';
import { Button } from '../../../shared/ui/Button';
import { InputField } from '../../../shared/ui/InputField';

// 안전한 날짜/시간 변환 헬퍼
const toDateValue = (str) => { 
  if (!str) return ''; 
  try { return new Date(str).toISOString().split('T')[0]; } catch { return ''; } 
};
const toTimeValue = (str) => { 
  if (!str) return ''; 
  try { 
    const d = new Date(str); 
    // 서버가 1970년 데이터로 줄 경우 시간만 추출
    return d.toTimeString().slice(0, 5); 
  } catch { return ''; } 
};

const INITIAL_FORM = {
  name: '', unitType: 'Army', region: '', wideArea: '', addressDetail: '',
  officerName: '', officerPhone: '', officerEmail: '',
  educationStart: '', educationEnd: '',
  workStartTime: '', workEndTime: '', lunchStartTime: '', lunchEndTime: ''
};

export const UnitDetailDrawer = ({ isOpen, onClose, unit: initialUnit, onSave, onDelete }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [locations, setLocations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [excludedDates, setExcludedDates] = useState([]);

  // 상세 데이터 조회 (수정 모드일 때만)
  const { data: detailData, isSuccess } = useQuery({
    queryKey: ['unitDetail', initialUnit?.id],
    queryFn: () => unitApi.getUnit(initialUnit.id),
    enabled: !!initialUnit?.id && isOpen,
    staleTime: 0, // 항상 최신 데이터 불러오기
  });

  // 데이터 초기화 및 바인딩
  useEffect(() => {
    if (isOpen) {
      if (initialUnit) {
        // [수정 모드]
        // API 응답이 있으면 사용하고, 없으면 리스트의 기본 정보라도 우선 표시
        const target = (isSuccess && detailData?.data) ? detailData.data : initialUnit;
        
        setFormData({
          name: target.name || '',
          unitType: target.unitType || 'Army',
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

        // 하위 데이터는 상세 조회 성공 시에만 바인딩 (리스트 데이터엔 없음)
        if (target.trainingLocations) setLocations(target.trainingLocations);
        if (target.schedules) setSchedules(target.schedules);
        
        // 불가일자 매핑
        if (target.excludedDates && Array.isArray(target.excludedDates)) {
          setExcludedDates(target.excludedDates.map(d => ({ 
            id: d.id, // 기존 데이터면 ID 유지
            date: toDateValue(d.date) 
          })));
        } else {
          setExcludedDates([]);
        }

      } else {
        // [신규 등록 모드]
        setFormData({ ...INITIAL_FORM });
        setLocations([]);
        setSchedules([]);
        setExcludedDates([]);
      }
      setActiveTab('basic');
    }
  }, [isOpen, initialUnit, detailData, isSuccess]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // --- Handlers: Excluded Dates ---
  const addExcludedDate = () => setExcludedDates([...excludedDates, { id: null, date: '' }]);
  const updateExcludedDate = (idx, val) => {
    const newArr = [...excludedDates]; newArr[idx].date = val; setExcludedDates(newArr);
  };
  const removeExcludedDate = (idx) => setExcludedDates(excludedDates.filter((_, i) => i !== idx));

  // --- Handlers: Locations ---
  const addLocation = () => setLocations([...locations, { 
    id: null, originalPlace: '', changedPlace: '', plannedCount: 0, instructorsNumbers: 0,
    hasInstructorLounge: false, hasWomenRestroom: false, hasCateredMeals: false, hasHallLodging: false, allowsPhoneBeforeAfter: false, note: ''
  }]);
  const updateLocation = (idx, field, val) => {
    const newLocs = [...locations]; newLocs[idx][field] = val; setLocations(newLocs);
  };
  const removeLocation = (idx) => setLocations(locations.filter((_, i) => i !== idx));

  // --- Handlers: Schedules ---
  const addSchedule = () => setSchedules([...schedules, { id: null, date: toDateValue(new Date()) }]);
  const updateSchedule = (idx, val) => {
    const newSchs = [...schedules]; newSchs[idx].date = val; setSchedules(newSchs);
  };
  const removeSchedule = (idx) => setSchedules(schedules.filter((_, i) => i !== idx));

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 필수값 검증
    const required = ['name', 'educationStart', 'educationEnd', 'workStartTime', 'workEndTime', 'officerName'];
    if (required.some(f => !formData[f])) {
      return alert("필수 항목(부대명, 교육기간, 시간, 담당자)을 모두 입력해주세요.");
    }

    const makeTime = (t) => { if(!t) return null; const d=new Date(); const [h,m]=t.split(':'); d.setHours(h,m,0,0); return d.toISOString(); };
    const makeDate = (d) => d ? new Date(d).toISOString() : null;

    const payload = {
      ...formData,
      educationStart: makeDate(formData.educationStart),
      educationEnd: makeDate(formData.educationEnd),
      workStartTime: makeTime(formData.workStartTime),
      workEndTime: makeTime(formData.workEndTime),
      lunchStartTime: makeTime(formData.lunchStartTime),
      lunchEndTime: makeTime(formData.lunchEndTime),
      
      // 하위 데이터 전송
      trainingLocations: locations, // id가 null이면 서버에서 처리
      excludedDates: excludedDates.filter(d => d.date).map(d => ({ 
        id: d.id, // 기존 ID 유지
        date: makeDate(d.date) 
      })),
      schedules: schedules.map(s => ({ 
        id: s.id, 
        date: makeDate(s.date) 
      })),
    };

    try {
      if (initialUnit) {
        await onSave({ id: initialUnit.id, data: payload });
      } else {
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      console.error("Save Error:", err);
      alert("저장에 실패했습니다. 콘솔 로그를 확인해주세요.");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[800px] bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0">
          <h2 className="text-xl font-bold">{initialUnit ? '부대 정보 수정' : '신규 부대 등록'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 shrink-0">
          {['basic', 'location', 'schedule'].map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 py-3 font-medium border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
              {tab === 'basic' ? '기본 정보' : tab === 'location' ? `교육장소 (${locations.length})` : `일정 (${schedules.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form id="unit-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* --- 1. 기본 정보 탭 --- */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">🏢 기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="부대명 *" name="name" value={formData.name} onChange={handleChange} required />
                    <div>
                      <label className="text-sm font-medium text-gray-700">군 구분 *</label>
                      <select name="unitType" value={formData.unitType} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg">
                        <option value="Army">육군</option><option value="Navy">해군</option><option value="AirForce">공군</option><option value="Marine">해병대</option>
                      </select>
                    </div>
                    <InputField label="광역" name="wideArea" value={formData.wideArea} onChange={handleChange} />
                    <InputField label="지역" name="region" value={formData.region} onChange={handleChange} />
                    <div className="col-span-2"><InputField label="상세주소" name="addressDetail" value={formData.addressDetail} onChange={handleChange} /></div>
                  </div>
                </section>

                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">⏰ 일정 및 시간</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField type="date" label="교육 시작 *" name="educationStart" value={formData.educationStart} onChange={handleChange} required />
                    <InputField type="date" label="교육 종료 *" name="educationEnd" value={formData.educationEnd} onChange={handleChange} required />
                    
                    {/* 불가일자 관리 UI */}
                    <div className="col-span-2 bg-red-50 p-4 rounded-lg border border-red-100">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-bold text-red-600">🚫 교육 불가 일자 (공휴일 등)</label>
                        <Button type="button" size="small" onClick={addExcludedDate} variant="outline" className="text-xs">+ 날짜 추가</Button>
                      </div>
                      <div className="space-y-2">
                        {excludedDates.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input type="date" className="border p-1.5 rounded text-sm w-40" value={item.date} onChange={(e) => updateExcludedDate(idx, e.target.value)} />
                            <button type="button" onClick={() => removeExcludedDate(idx)} className="text-red-500 hover:bg-red-100 p-1 rounded">✕</button>
                          </div>
                        ))}
                        {excludedDates.length === 0 && <p className="text-xs text-gray-400">등록된 불가 일자가 없습니다.</p>}
                      </div>
                    </div>

                    <div className="col-span-2 border-t my-2"></div>
                    <InputField type="time" label="근무 시작 *" name="workStartTime" value={formData.workStartTime} onChange={handleChange} required />
                    <InputField type="time" label="근무 종료 *" name="workEndTime" value={formData.workEndTime} onChange={handleChange} required />
                    <InputField type="time" label="점심 시작 *" name="lunchStartTime" value={formData.lunchStartTime} onChange={handleChange} required />
                    <InputField type="time" label="점심 종료 *" name="lunchEndTime" value={formData.lunchEndTime} onChange={handleChange} required />
                  </div>
                </section>

                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">📞 담당자</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="이름 *" name="officerName" value={formData.officerName} onChange={handleChange} required />
                    <InputField label="연락처 *" name="officerPhone" value={formData.officerPhone} onChange={handleChange} required />
                    <div className="col-span-2"><InputField label="이메일" name="officerEmail" value={formData.officerEmail} onChange={handleChange} /></div>
                  </div>
                </section>
              </div>
            )}

            {/* --- 2. 교육 장소 탭 (모든 필드 구현) --- */}
            {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-gray-700">총 {locations.length}개</span>
                  <Button type="button" onClick={addLocation} size="small">+ 장소 추가</Button>
                </div>
                
                {locations.map((loc, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border shadow-sm relative group">
                    <button type="button" onClick={() => removeLocation(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold">삭제</button>
                    <h4 className="font-bold mb-3 text-gray-800 border-b pb-2">장소 #{idx + 1}</h4>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <InputField label="기존 장소명" value={loc.originalPlace} onChange={(e) => updateLocation(idx, 'originalPlace', e.target.value)} />
                      <InputField label="변경 장소명" value={loc.changedPlace} onChange={(e) => updateLocation(idx, 'changedPlace', e.target.value)} />
                      <InputField type="number" label="계획인원" value={loc.plannedCount} onChange={(e) => updateLocation(idx, 'plannedCount', e.target.value)} />
                      <InputField type="number" label="강사 수" value={loc.instructorsNumbers} onChange={(e) => updateLocation(idx, 'instructorsNumbers', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-gray-50 p-3 rounded-lg mb-3 border border-gray-100">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={loc.hasInstructorLounge} onChange={(e) => updateLocation(idx, 'hasInstructorLounge', e.target.checked)} /> 강사대기실</label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={loc.hasWomenRestroom} onChange={(e) => updateLocation(idx, 'hasWomenRestroom', e.target.checked)} /> 여자화장실</label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={loc.hasCateredMeals} onChange={(e) => updateLocation(idx, 'hasCateredMeals', e.target.checked)} /> 수탁급식</label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={loc.hasHallLodging} onChange={(e) => updateLocation(idx, 'hasHallLodging', e.target.checked)} /> 회관숙박</label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={loc.allowsPhoneBeforeAfter} onChange={(e) => updateLocation(idx, 'allowsPhoneBeforeAfter', e.target.checked)} /> 휴대폰 불출</label>
                    </div>
                    
                    <InputField label="특이사항(비고)" value={loc.note} onChange={(e) => updateLocation(idx, 'note', e.target.value)} placeholder="특이사항을 입력하세요" />
                  </div>
                ))}
              </div>
            )}

            {/* --- 3. 일정 탭 --- */}
            {activeTab === 'schedule' && (
               <div className="space-y-4">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-gray-700">총 {schedules.length}일</span>
                    <Button type="button" onClick={addSchedule} size="small">+ 날짜 추가</Button>
                 </div>
                 <div className="bg-white rounded-xl border border-gray-200 divide-y">
                   {schedules.map((sch, idx) => (
                     <div key={idx} className="p-3 flex items-center gap-3">
                       <span className="text-gray-400 text-sm font-mono w-6">{idx + 1}.</span>
                       <input type="date" className="border p-2 rounded flex-1" value={toDateValue(sch.date)} onChange={(e) => updateSchedule(idx, e.target.value)} />
                       <button type="button" onClick={() => removeSchedule(idx)} className="text-red-500 hover:bg-red-50 px-2 rounded">삭제</button>
                     </div>
                   ))}
                   {schedules.length === 0 && <div className="p-6 text-center text-gray-400">등록된 일정이 없습니다.</div>}
                 </div>
               </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t bg-white flex justify-between items-center shrink-0">
           {initialUnit && <button type="button" onClick={() => {if(confirm('정말 삭제하시겠습니까?')) onDelete(initialUnit.id)}} className="text-red-500 font-medium">삭제</button>}
           <div className="flex gap-2 ml-auto">
             <Button variant="outline" onClick={onClose}>취소</Button>
             <button type="submit" form="unit-form" className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm transition-colors">저장</button>
           </div>
        </div>
      </div>
    </>
  );
};