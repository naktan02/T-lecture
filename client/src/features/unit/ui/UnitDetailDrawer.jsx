// client/src/features/unit/ui/UnitDetailDrawer.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unitApi } from '../api/unitApi';
import { Button } from '../../../shared/ui/Button';
import { InputField } from '../../../shared/ui/InputField';

const toDateValue = (str) => { if (!str) return ''; try { return new Date(str).toISOString().split('T')[0]; } catch { return ''; } };
const toTimeValue = (str) => { if (!str) return ''; try { return new Date(str).toTimeString().slice(0, 5); } catch { return ''; } };

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
  const [excludedDates, setExcludedDates] = useState([]);
  
  // 1. 상세 데이터 조회
  const { data: detailData, isSuccess, isLoading } = useQuery({
    queryKey: ['unitDetail', initialUnit?.id],
    queryFn: () => unitApi.getUnit(initialUnit.id),
    enabled: !!initialUnit?.id && isOpen,
    staleTime: 0, 
  });

  // 2. 서버에서 받은 진짜 부대 데이터 찾기
  // detailData가 Axios 응답(data.data)인지, 가공된 응답(data)인지 확인
  const fetchedUnit = isSuccess ? (detailData.data?.data || detailData.data || detailData) : null;
  const displayUnit = fetchedUnit || initialUnit || {};

  // ✅ [핵심] 일정은 수정 대상이 아니므로 state에 넣지 않고 바로 변수로 선언 (즉시 조회됨)
  const schedules = (fetchedUnit?.schedules || []).map(s => ({
    id: s.id,
    date: toDateValue(s.date)
  }));

  // 3. 데이터 바인딩 (수정 가능한 필드만 State로 관리)
  useEffect(() => {
    if (isOpen) {
      if (initialUnit) {
        // [수정 모드]
        setFormData({
          name: displayUnit.name || '',
          unitType: displayUnit.unitType || 'Army',
          region: displayUnit.region || '',
          wideArea: displayUnit.wideArea || '',
          addressDetail: displayUnit.addressDetail || '',
          officerName: displayUnit.officerName || '',
          officerPhone: displayUnit.officerPhone || '',
          officerEmail: displayUnit.officerEmail || '',
          educationStart: toDateValue(displayUnit.educationStart),
          educationEnd: toDateValue(displayUnit.educationEnd),
          workStartTime: toTimeValue(displayUnit.workStartTime),
          workEndTime: toTimeValue(displayUnit.workEndTime),
          lunchStartTime: toTimeValue(displayUnit.lunchStartTime),
          lunchEndTime: toTimeValue(displayUnit.lunchEndTime),
        });

        // 교육장소
        if (displayUnit.trainingLocations) setLocations(displayUnit.trainingLocations);
        
        // 불가일자
        if (displayUnit.excludedDates && Array.isArray(displayUnit.excludedDates)) {
          setExcludedDates(displayUnit.excludedDates.map(d => ({
            id: d.id,
            date: toDateValue(d.date)
          })));
        } else {
          setExcludedDates([]);
        }
      } else {
        // [신규 모드]
        setFormData({ ...INITIAL_FORM });
        setLocations([]);
        setExcludedDates([]);
      }
      setActiveTab('basic');
    }
  }, [isOpen, initialUnit, isSuccess, detailData]); // fetchedUnit 변경 시 실행

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // --- Handlers ---
  const addExcludedDate = () => setExcludedDates([...excludedDates, { id: null, date: '' }]);
  const updateExcludedDate = (i, v) => { const n = [...excludedDates]; n[i].date = v; setExcludedDates(n); };
  const removeExcludedDate = (i) => setExcludedDates(excludedDates.filter((_, idx) => idx !== i));

  const addLocation = () => setLocations([...locations, { id: null, originalPlace: '', plannedCount: 0, instructorsNumbers: 0, hasInstructorLounge: false, hasWomenRestroom: false, hasCateredMeals: false, hasHallLodging: false, allowsPhoneBeforeAfter: false, note: '' }]);
  const updateLocation = (i, f, v) => { const n = [...locations]; n[i][f] = v; setLocations(n); };
  const removeLocation = (i) => setLocations(locations.filter((_, idx) => idx !== i));

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ['name', 'educationStart', 'educationEnd', 'workStartTime', 'workEndTime', 'officerName'];
    if (required.some(f => !formData[f])) return alert("필수 항목을 모두 입력해주세요.");

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
      trainingLocations: locations, 
      excludedDates: excludedDates.filter(d => d.date).map(d => ({ id: d.id, date: makeDate(d.date) })),
      schedules: [], // 서버 자동 생성
    };

    try {
      if (initialUnit) await onSave({ id: initialUnit.id, data: payload });
      else await onSave(payload);
      onClose();
    } catch (err) {
      console.error(err);
      alert("저장 실패");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[800px] bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{initialUnit ? '부대 정보 수정' : '신규 부대 등록'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 shrink-0">
          {['basic', 'location', 'schedule'].map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 py-3 font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
              {tab === 'basic' ? '기본 정보' : tab === 'location' ? `교육장소 (${locations.length})` : `일정 (${schedules.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form id="unit-form" onSubmit={handleSubmit} className="space-y-6">
            {/* 1. 기본 정보 */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2">🏢 기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="부대명 *" name="name" value={formData.name} onChange={handleChange} required />
                    <div><label className="text-sm font-medium">군 구분 *</label><select name="unitType" value={formData.unitType} onChange={handleChange} className="w-full mt-1 p-2 border rounded-lg"><option value="Army">육군</option><option value="Navy">해군</option><option value="AirForce">공군</option><option value="Marine">해병대</option></select></div>
                    <InputField label="광역" name="wideArea" value={formData.wideArea} onChange={handleChange} />
                    <InputField label="지역" name="region" value={formData.region} onChange={handleChange} />
                    <div className="col-span-2"><InputField label="상세주소" name="addressDetail" value={formData.addressDetail} onChange={handleChange} /></div>
                  </div>
                </section>
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2">⏰ 일정 및 시간</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField type="date" label="교육 시작 *" name="educationStart" value={formData.educationStart} onChange={handleChange} required />
                    <InputField type="date" label="교육 종료 *" name="educationEnd" value={formData.educationEnd} onChange={handleChange} required />
                    <div className="col-span-2 bg-red-50 p-4 rounded-lg border border-red-100">
                        <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-red-600">🚫 교육 불가 일자</label><Button type="button" size="small" onClick={addExcludedDate} variant="outline" className="bg-white text-xs">+ 추가</Button></div>
                        {excludedDates.map((item, idx) => (
                            <div key={idx} className="flex gap-2 mb-2 items-center"><input type="date" className="border p-2 rounded text-sm bg-white" value={item.date} onChange={(e)=>updateExcludedDate(idx,e.target.value)} /><button type="button" onClick={()=>removeExcludedDate(idx)} className="text-red-500 px-2">✕</button></div>
                        ))}
                        {excludedDates.length === 0 && <p className="text-xs text-gray-400">등록된 불가 일자가 없습니다.</p>}
                    </div>
                    <div className="col-span-2 border-t my-2" />
                    <InputField type="time" label="근무 시작 *" name="workStartTime" value={formData.workStartTime} onChange={handleChange} required />
                    <InputField type="time" label="근무 종료 *" name="workEndTime" value={formData.workEndTime} onChange={handleChange} required />
                    <InputField type="time" label="점심 시작" name="lunchStartTime" value={formData.lunchStartTime} onChange={handleChange} />
                    <InputField type="time" label="점심 종료" name="lunchEndTime" value={formData.lunchEndTime} onChange={handleChange} />
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

            {/* 2. 교육 장소 */}
            {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="flex justify-between mb-4"><Button type="button" onClick={addLocation} size="small">+ 장소 추가</Button></div>
                {locations.map((loc, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border shadow-sm relative">
                    <button type="button" onClick={() => removeLocation(idx)} className="absolute top-4 right-4 text-red-500 font-bold">삭제</button>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <InputField label="기존 장소" value={loc.originalPlace} onChange={(e) => updateLocation(idx, 'originalPlace', e.target.value)} />
                      <InputField label="변경 장소" value={loc.changedPlace} onChange={(e) => updateLocation(idx, 'changedPlace', e.target.value)} />
                      <InputField type="number" label="계획인원" value={loc.plannedCount} onChange={(e) => updateLocation(idx, 'plannedCount', e.target.value)} />
                      <InputField type="number" label="강사 수" value={loc.instructorsNumbers} onChange={(e) => updateLocation(idx, 'instructorsNumbers', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-gray-50 p-3 rounded mb-3">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={loc.hasInstructorLounge} onChange={(e) => updateLocation(idx, 'hasInstructorLounge', e.target.checked)} /> 강사대기실</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={loc.hasWomenRestroom} onChange={(e) => updateLocation(idx, 'hasWomenRestroom', e.target.checked)} /> 여자화장실</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={loc.hasCateredMeals} onChange={(e) => updateLocation(idx, 'hasCateredMeals', e.target.checked)} /> 수탁급식</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={loc.allowsPhoneBeforeAfter} onChange={(e) => updateLocation(idx, 'allowsPhoneBeforeAfter', e.target.checked)} /> 휴대폰 불출</label>
                    </div>
                    <InputField label="비고" value={loc.note} onChange={(e) => updateLocation(idx, 'note', e.target.value)} />
                  </div>
                ))}
              </div>
            )}

            {/* 3. 일정 (즉시 조회) */}
            {activeTab === 'schedule' && (
               <div className="space-y-4">
                 {schedules.length > 0 ? (
                   <>
                     <div className="bg-blue-50 p-3 rounded text-center text-sm text-blue-800 mb-4">
                       <b>📅 등록된 교육 일정 ({schedules.length}일)</b><br/>기간 및 불가일자를 수정하고 저장하면 자동 갱신됩니다.
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {schedules.map((sch, idx) => (
                         <div key={idx} className="bg-white border p-3 rounded text-center shadow-sm">
                           <div className="text-xs text-gray-400 mb-1">{idx + 1}일차</div>
                           <div className="font-bold">{sch.date}</div>
                         </div>
                       ))}
                     </div>
                   </>
                 ) : (
                   <div className="p-10 text-center text-gray-400 border border-dashed rounded bg-gray-50">
                     {isLoading ? "데이터 불러오는 중..." : "등록된 일정이 없습니다."}
                   </div>
                 )}
               </div>
            )}
          </form>
        </div>
        <div className="px-6 py-4 border-t bg-white flex justify-between shrink-0">
           {initialUnit && <button type="button" onClick={() => onDelete(initialUnit.id)} className="text-red-500">삭제</button>}
           <div className="flex gap-2 ml-auto">
             <Button variant="outline" onClick={onClose}>취소</Button>
             <button type="submit" form="unit-form" className="px-5 py-2 bg-green-600 text-white rounded font-medium">저장</button>
           </div>
        </div>
      </div>
    </>
  );
};