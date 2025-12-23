// client/src/features/unit/ui/UnitDetailDrawer.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unitApi } from '../api/unitApi';
import { Button } from '../../../shared/ui/Button';
import { InputField } from '../../../shared/ui/InputField';

// 헬퍼
const toDateValue = (str) => { if (!str) return ''; try { return new Date(str).toISOString().split('T')[0]; } catch { return ''; } };
const toTimeValue = (str) => { if (!str) return ''; try { const d = new Date(str); return d.toTimeString().slice(0, 5); } catch { return ''; } };

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

  // 상세 데이터 Fetching
  const { data: detailData, isSuccess } = useQuery({
    queryKey: ['unitDetail', initialUnit?.id],
    queryFn: () => unitApi.getUnit(initialUnit.id),
    enabled: !!initialUnit?.id && isOpen,
    staleTime: 0,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialUnit) {
        // [수정 모드]
        // API 데이터가 있으면(isSuccess) 그것을 쓰고, 없으면 리스트 데이터 사용
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

        // 하위 데이터 바인딩
        if (target.trainingLocations) setLocations(target.trainingLocations);
        
        // ✅ [문제 해결] 불가일자 매핑 확인
        if (target.excludedDates && Array.isArray(target.excludedDates)) {
          setExcludedDates(target.excludedDates.map(d => ({ 
            id: d.id, // 기존 ID가 있으면 유지
            date: toDateValue(d.date) 
          })));
        } else {
          setExcludedDates([]);
        }

        // 스케줄은 서버 자동 계산이므로 보여주기용으로만 바인딩 (수정은 불가일자/기간으로 제어)
        if (target.schedules) setSchedules(target.schedules);

      } else {
        // [신규 모드]
        setFormData({ ...INITIAL_FORM });
        setLocations([]);
        setSchedules([]);
        setExcludedDates([]);
      }
      setActiveTab('basic');
    }
  }, [isOpen, initialUnit, detailData, isSuccess]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // --- Handlers ---
  const addExcludedDate = () => setExcludedDates([...excludedDates, { id: null, date: '' }]);
  const updateExcludedDate = (i, v) => { const n = [...excludedDates]; n[i].date = v; setExcludedDates(n); };
  const removeExcludedDate = (i) => setExcludedDates(excludedDates.filter((_, idx) => idx !== i));

  const addLocation = () => setLocations([...locations, { 
    id: null, originalPlace: '', changedPlace: '', plannedCount: 0, instructorsNumbers: 0,
    hasInstructorLounge: false, hasWomenRestroom: false, hasCateredMeals: false, hasHallLodging: false, allowsPhoneBeforeAfter: false, note: ''
  }]);
  const updateLocation = (i, f, v) => { const n = [...locations]; n[i][f] = v; setLocations(n); };
  const removeLocation = (i) => setLocations(locations.filter((_, idx) => idx !== i));

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
      
      trainingLocations: locations,
      
      // ✅ 불가일자 데이터 전송 (빈 값 필터링)
      excludedDates: excludedDates.filter(d => d.date).map(d => ({ 
        id: d.id, 
        date: makeDate(d.date) 
      })),
      
      // 스케줄은 서버에서 자동 계산하므로 굳이 보내지 않음 (빈 배열)
      schedules: [], 
    };

    try {
      if (initialUnit) {
        await onSave({ id: initialUnit.id, data: payload });
      } else {
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
      alert("저장에 실패했습니다. 관리자에게 문의하세요.");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[800px] bg-white shadow-2xl flex flex-col h-full">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0">
          <h2 className="text-xl font-bold">{initialUnit ? '부대 정보 수정' : '신규 부대 등록'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex border-b bg-gray-50 shrink-0">
          {['basic', 'location', 'schedule'].map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 py-3 font-medium border-b-2 ${activeTab===tab?'border-blue-600 text-blue-600':'border-transparent text-gray-500'}`}>
              {tab === 'basic' ? '기본 정보' : tab === 'location' ? `교육장소 (${locations.length})` : '일정 (자동계산)'}
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
                    <InputField label="부대명 *" name="name" value={formData.name} onChange={handleChange} required />
                    <div>
                      <label className="text-sm font-medium">군 구분 *</label>
                      <select name="unitType" value={formData.unitType} onChange={handleChange} className="w-full mt-1 p-2 border rounded"><option value="Army">육군</option><option value="Navy">해군</option><option value="AirForce">공군</option><option value="Marine">해병대</option></select>
                    </div>
                    <InputField label="광역" name="wideArea" value={formData.wideArea} onChange={handleChange} />
                    <InputField label="지역" name="region" value={formData.region} onChange={handleChange} />
                    <div className="col-span-2"><InputField label="상세주소" name="addressDetail" value={formData.addressDetail} onChange={handleChange} /></div>
                  </div>
                </section>

                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">⏰ 일정 관리</h3>
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

                    <div className="col-span-2 border-t my-2" />
                    <InputField type="time" label="근무 시작 *" name="workStartTime" value={formData.workStartTime} onChange={handleChange} required />
                    <InputField type="time" label="근무 종료 *" name="workEndTime" value={formData.workEndTime} onChange={handleChange} required />
                    <InputField type="time" label="점심 시작 *" name="lunchStartTime" value={formData.lunchStartTime} onChange={handleChange} required />
                    <InputField type="time" label="점심 종료 *" name="lunchEndTime" value={formData.lunchEndTime} onChange={handleChange} required />
                  </div>
                </section>

                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">📞 담당자 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="이름 *" name="officerName" value={formData.officerName} onChange={handleChange} required />
                    <InputField label="연락처 *" name="officerPhone" value={formData.officerPhone} onChange={handleChange} required />
                    <div className="col-span-2"><InputField label="이메일" name="officerEmail" value={formData.officerEmail} onChange={handleChange} /></div>
                  </div>
                </section>
              </div>
            )}

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
                    
                    <InputField label="특이사항(비고)" value={loc.note} onChange={(e) => updateLocation(idx, 'note', e.target.value)} />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'schedule' && (
               <div className="space-y-4">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-gray-700">총 {schedules.length}일 (자동 계산됨)</span>
                 </div>
                 <div className="bg-white rounded-xl border border-gray-200 divide-y">
                   {schedules.map((sch, idx) => (
                     <div key={idx} className="p-3 flex items-center gap-3">
                       <span className="text-gray-400 text-sm font-mono w-6">{idx + 1}.</span>
                       {/* 보여주기 전용 (수정 불가) */}
                       <div className="flex-1 font-medium text-gray-700">{toDateValue(sch.date)}</div>
                     </div>
                   ))}
                   {schedules.length === 0 && <div className="p-6 text-center text-gray-400">일정이 없습니다. 기간을 설정해주세요.</div>}
                 </div>
                 <p className="text-sm text-gray-500 mt-2 text-center">※ 일정은 '기본 정보' 탭의 기간 및 불가일자에 따라 자동 생성됩니다.</p>
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