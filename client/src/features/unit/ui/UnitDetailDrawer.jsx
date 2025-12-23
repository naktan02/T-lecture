import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unitApi } from '../api/unitApi';
import { Button } from '../../../shared/ui/Button';
import { InputField } from '../../../shared/ui/InputField';

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

  const { data: detailData } = useQuery({
    queryKey: ['unitDetail', initialUnit?.id],
    queryFn: () => unitApi.getUnit(initialUnit.id),
    enabled: !!initialUnit?.id && isOpen, staleTime: 0,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialUnit) {
        const target = detailData?.data || initialUnit;
        setFormData({
          name: target.name || '', unitType: target.unitType || 'Army',
          region: target.region || '', wideArea: target.wideArea || '', addressDetail: target.addressDetail || '',
          officerName: target.officerName || '', officerPhone: target.officerPhone || '', officerEmail: target.officerEmail || '',
          educationStart: toDateValue(target.educationStart), educationEnd: toDateValue(target.educationEnd),
          workStartTime: toTimeValue(target.workStartTime), workEndTime: toTimeValue(target.workEndTime),
          lunchStartTime: toTimeValue(target.lunchStartTime), lunchEndTime: toTimeValue(target.lunchEndTime),
        });
        setLocations(target.trainingLocations || []);
        setSchedules(target.schedules || []);
        setExcludedDates(target.excludedDates?.map(d => ({ date: toDateValue(d.date) })) || []);
      } else {
        setFormData({ ...INITIAL_FORM });
        setLocations([]); setSchedules([]); setExcludedDates([]);
      }
      setActiveTab('basic');
    }
  }, [isOpen, initialUnit, detailData]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  // Handlers
  const addExcludedDate = () => setExcludedDates([...excludedDates, { date: '' }]);
  const updateExcludedDate = (i, v) => { const n = [...excludedDates]; n[i].date = v; setExcludedDates(n); };
  const removeExcludedDate = (i) => setExcludedDates(excludedDates.filter((_, idx) => idx !== i));

  const addLocation = () => setLocations([...locations, { id: null, originalPlace: '', plannedCount: 0 }]);
  const updateLocation = (i, f, v) => { const n = [...locations]; n[i][f] = v; setLocations(n); };
  const removeLocation = (i) => setLocations(locations.filter((_, idx) => idx !== i));

  const addSchedule = () => setSchedules([...schedules, { id: null, date: toDateValue(new Date()) }]);
  const updateSchedule = (i, v) => { const n = [...schedules]; n[i].date = v; setSchedules(n); };
  const removeSchedule = (i) => setSchedules(schedules.filter((_, idx) => idx !== i));

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
      excludedDates: excludedDates.filter(d => d.date).map(d => ({ date: makeDate(d.date) })),
      schedules: schedules.map(s => ({ ...s, date: makeDate(s.date) })),
    };

    try {
      if (initialUnit) await onSave({ id: initialUnit.id, data: payload });
      else await onSave(payload);
      onClose();
    } catch (err) { console.error(err); alert("저장 실패"); }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[800px] bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0">
          <h2 className="text-xl font-bold">{initialUnit ? '부대 정보 수정' : '신규 부대 등록'}</h2>
          <button onClick={onClose}>✕</button>
        </div>
        {/* Body - Tabs & Form */}
        <div className="flex border-b bg-gray-50 shrink-0">
          {['basic', 'location', 'schedule'].map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 py-3 font-medium border-b-2 ${activeTab===tab?'border-blue-600':'border-transparent'}`}>{tab}</button>
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
                    <div><label className="text-sm font-medium">군 구분 *</label><select name="unitType" value={formData.unitType} onChange={handleChange} className="w-full mt-1 p-2 border rounded"><option value="Army">육군</option><option value="Navy">해군</option></select></div>
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
                    <div className="col-span-2 bg-red-50 p-3 rounded">
                        <div className="flex justify-between mb-2"><label className="text-red-600 font-bold">🚫 불가일자</label><Button type="button" size="small" onClick={addExcludedDate}>+ 추가</Button></div>
                        {excludedDates.map((item, idx) => (
                            <div key={idx} className="flex gap-2 mb-2"><input type="date" className="border p-1 rounded" value={item.date} onChange={(e)=>updateExcludedDate(idx,e.target.value)} /><button type="button" onClick={()=>removeExcludedDate(idx)}>×</button></div>
                        ))}
                    </div>
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
            {activeTab === 'location' && <div>
                <div className="flex justify-between mb-4"><Button type="button" onClick={addLocation} size="small">+ 추가</Button></div>
                {locations.map((loc, idx) => (
                    <div key={idx} className="bg-white p-4 rounded border mb-4">
                        <InputField label="장소명" value={loc.originalPlace} onChange={(e)=>updateLocation(idx,'originalPlace',e.target.value)} />
                        {/* ... 기타 필드 ... */}
                        <button type="button" onClick={()=>removeLocation(idx)} className="text-red-500 mt-2">삭제</button>
                    </div>
                ))}
            </div>}
            {activeTab === 'schedule' && <div>
                <div className="flex justify-between mb-4"><Button type="button" onClick={addSchedule} size="small">+ 추가</Button></div>
                {schedules.map((sch, idx) => (
                    <div key={idx} className="flex gap-2 mb-2"><input type="date" className="border p-2 rounded" value={toDateValue(sch.date)} onChange={(e)=>updateSchedule(idx,e.target.value)} /><button type="button" onClick={()=>removeSchedule(idx)}>삭제</button></div>
                ))}
            </div>}
          </form>
        </div>
        <div className="px-6 py-4 border-t bg-white flex justify-between shrink-0">
           {initialUnit && <button type="button" onClick={() => onDelete(initialUnit.id)} className="text-red-500">삭제</button>}
           <div className="flex gap-2 ml-auto">
             <Button variant="outline" onClick={onClose}>취소</Button>
             <button type="submit" form="unit-form" className="px-4 py-2 bg-green-600 text-white rounded">저장</button>
           </div>
        </div>
      </div>
    </>
  );
};