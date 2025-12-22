// client/src/features/unit/ui/UnitDetailDrawer.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unitApi } from '../api/unitApi';
import { Button } from '../../../shared/ui/Button';
import { InputField } from '../../../shared/ui/InputField';

// 헬퍼 함수들
const toDateValue = (str) => (str ? new Date(str).toISOString().split('T')[0] : '');
const toTimeValue = (str) => {
  if (!str) return '';
  const d = new Date(str);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};
const toIsoDateTime = (dateStr, timeStr = '00:00') => {
  if (!dateStr) return null;
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
};

export const UnitDetailDrawer = ({ isOpen, onClose, unit: initialUnit, onSave, onDelete }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({});
  const [locations, setLocations] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // 상세 데이터 Fetching
  const { data: detailData } = useQuery({
    queryKey: ['unitDetail', initialUnit?.id],
    queryFn: () => unitApi.getUnit(initialUnit.id),
    enabled: !!initialUnit?.id && isOpen, 
    staleTime: 0,
  });

  useEffect(() => {
    if (isOpen) {
      // 리스트에서 받은 정보(initialUnit) 혹은 상세 조회된 정보(detailData.data) 사용
      const targetUnit = detailData?.data || initialUnit;

      if (targetUnit) {
        setFormData({
          name: targetUnit.name || '',
          unitType: targetUnit.unitType || 'Army',
          region: targetUnit.region || '',
          wideArea: targetUnit.wideArea || '',
          addressDetail: targetUnit.addressDetail || '',
          officerName: targetUnit.officerName || '',
          officerPhone: targetUnit.officerPhone || '',
          officerEmail: targetUnit.officerEmail || '',
          educationStart: toDateValue(targetUnit.educationStart),
          educationEnd: toDateValue(targetUnit.educationEnd),
          workStartTime: toTimeValue(targetUnit.workStartTime),
          workEndTime: toTimeValue(targetUnit.workEndTime),
          lunchStartTime: toTimeValue(targetUnit.lunchStartTime),
          lunchEndTime: toTimeValue(targetUnit.lunchEndTime),
        });

        // 상세 정보가 로드된 경우에만 하위 데이터 설정
        setLocations(targetUnit.trainingLocations || []);
        setSchedules(targetUnit.schedules || []);
      } else {
        // 신규 등록
        setFormData({ unitType: 'Army', name: '', /* 초기값들 */ });
        setLocations([]);
        setSchedules([]);
      }
    }
  }, [isOpen, initialUnit, detailData]);

  const handleBasicChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- 교육장소 핸들러 ---
  const addLocation = () => {
    setLocations([...locations, { 
      id: null, 
      originalPlace: '', changedPlace: '', 
      hasInstructorLounge: false, hasWomenRestroom: false, 
      hasCateredMeals: false, hasHallLodging: false, 
      allowsPhoneBeforeAfter: false,
      plannedCount: 0, actualCount: 0 
    }]);
  };
  const updateLocation = (index, field, value) => {
    const newLocs = [...locations];
    newLocs[index][field] = value;
    setLocations(newLocs);
  };
  const removeLocation = (index) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  // --- 일정 핸들러 ---
  const addSchedule = () => {
    setSchedules([...schedules, { id: null, date: toDateValue(new Date()) }]);
  };
  const updateSchedule = (index, value) => {
    const newSchs = [...schedules];
    newSchs[index].date = value;
    setSchedules(newSchs);
  };
  const removeSchedule = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit triggered!"); // ✅ 이제 이 로그가 보일 것입니다.

    // 데이터 변환 로직 (내부 함수 혹은 외부 함수 사용)
    const makeDateTime = (timeStr) => {
        if (!timeStr) return null;
        try {
            const now = new Date();
            const [h, m] = timeStr.split(':').map(Number);
            now.setHours(h, m, 0, 0);
            return now.toISOString();
        } catch { return null; }
    };
    const makeDate = (dateStr) => (dateStr ? new Date(dateStr).toISOString() : null);

    const payload = {
      ...formData,
      educationStart: makeDate(formData.educationStart),
      educationEnd: makeDate(formData.educationEnd),
      workStartTime: makeDateTime(formData.workStartTime),
      workEndTime: makeDateTime(formData.workEndTime),
      lunchStartTime: makeDateTime(formData.lunchStartTime),
      lunchEndTime: makeDateTime(formData.lunchEndTime),
      trainingLocations: locations,
      schedules: schedules.map(s => ({ ...s, date: makeDate(s.date) })),
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
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[700px] bg-white shadow-2xl flex flex-col h-full">
        
        {/* Header (수정됨) */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0">
          {/* ✅ [수정] unit -> initialUnit 으로 변경 */}
          <h2 className="text-xl font-bold text-gray-800">{initialUnit ? formData.name : '신규 부대 등록'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 shrink-0">
          {['basic', 'location', 'schedule'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'basic' && '기본 정보'}
              {tab === 'location' && `교육 장소 (${locations.length})`}
              {tab === 'schedule' && `일정 (${schedules.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form id="unit-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. 기본 정보 탭 */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">🏢 기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="부대명" name="name" value={formData.name} onChange={handleBasicChange} required />
                    <div>
                      <label className="text-sm font-medium text-gray-700">군 구분</label>
                      <select name="unitType" value={formData.unitType} onChange={handleBasicChange} className="w-full mt-1 p-2 border rounded-lg">
                        <option value="Army">육군</option>
                        <option value="Navy">해군</option>
                        <option value="AirForce">공군</option>
                        <option value="Marine">해병대</option>
                      </select>
                    </div>
                    <InputField label="광역" name="wideArea" value={formData.wideArea} onChange={handleBasicChange} />
                    <InputField label="지역" name="region" value={formData.region} onChange={handleBasicChange} />
                    <div className="col-span-2">
                      <InputField label="상세주소" name="addressDetail" value={formData.addressDetail} onChange={handleBasicChange} />
                    </div>
                  </div>
                </section>
                {/* ... (운영 시간, 담당자 정보 섹션은 그대로 유지) ... */}
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">⏰ 운영 시간</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField type="date" label="교육 시작" name="educationStart" value={formData.educationStart} onChange={handleBasicChange} />
                    <InputField type="date" label="교육 종료" name="educationEnd" value={formData.educationEnd} onChange={handleBasicChange} />
                    <InputField type="time" label="근무 시작" name="workStartTime" value={formData.workStartTime} onChange={handleBasicChange} />
                    <InputField type="time" label="근무 종료" name="workEndTime" value={formData.workEndTime} onChange={handleBasicChange} />
                    <InputField type="time" label="점심 시작" name="lunchStartTime" value={formData.lunchStartTime} onChange={handleBasicChange} />
                    <InputField type="time" label="점심 종료" name="lunchEndTime" value={formData.lunchEndTime} onChange={handleBasicChange} />
                  </div>
                </section>

                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">📞 담당자</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="이름" name="officerName" value={formData.officerName} onChange={handleBasicChange} />
                    <InputField label="연락처" name="officerPhone" value={formData.officerPhone} onChange={handleBasicChange} />
                    <div className="col-span-2">
                       <InputField label="이메일" name="officerEmail" value={formData.officerEmail} onChange={handleBasicChange} />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* 2. 교육 장소 탭 (이전 코드와 동일, 생략 없이 사용) */}
            {activeTab === 'location' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-500">총 {locations.length}개의 교육장소</span>
                   <Button type="button" size="small" onClick={addLocation}>+ 장소 추가</Button>
                </div>
                {locations.map((loc, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border shadow-sm relative group">
                    <button type="button" onClick={() => removeLocation(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600">삭제</button>
                    <h4 className="font-bold mb-3 text-gray-700">장소 #{idx + 1}</h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <InputField label="기존 장소명" value={loc.originalPlace} onChange={(e) => updateLocation(idx, 'originalPlace', e.target.value)} />
                      <InputField label="변경 장소명" value={loc.changedPlace} onChange={(e) => updateLocation(idx, 'changedPlace', e.target.value)} />
                    </div>
                    {/* ... (기타 필드 생략 없이 사용) ... */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <InputField type="number" label="계획인원" value={loc.plannedCount} onChange={(e) => updateLocation(idx, 'plannedCount', e.target.value)} />
                      <InputField type="number" label="참여인원" value={loc.actualCount} onChange={(e) => updateLocation(idx, 'actualCount', e.target.value)} />
                      <InputField type="number" label="강사 수" value={loc.instructorsNumbers} onChange={(e) => updateLocation(idx, 'instructorsNumbers', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={loc.hasInstructorLounge} onChange={(e) => updateLocation(idx, 'hasInstructorLounge', e.target.checked)} /> 강사대기실
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={loc.hasWomenRestroom} onChange={(e) => updateLocation(idx, 'hasWomenRestroom', e.target.checked)} /> 여자화장실
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={loc.hasCateredMeals} onChange={(e) => updateLocation(idx, 'hasCateredMeals', e.target.checked)} /> 수탁급식
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={loc.allowsPhoneBeforeAfter} onChange={(e) => updateLocation(idx, 'allowsPhoneBeforeAfter', e.target.checked)} /> 휴대폰 불출
                      </label>
                    </div>
                    <div className="mt-3">
                       <InputField label="특이사항" value={loc.note || ''} onChange={(e) => updateLocation(idx, 'note', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. 일정 탭 (이전 코드와 동일, 생략 없이 사용) */}
            {activeTab === 'schedule' && (
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">총 {schedules.length}일의 교육 일정</span>
                    <Button type="button" size="small" onClick={addSchedule}>+ 날짜 추가</Button>
                 </div>
                 <div className="bg-white rounded-xl border shadow-sm divide-y">
                   {schedules.map((sch, idx) => (
                     <div key={idx} className="p-4 flex items-center gap-4">
                       <span className="font-bold text-gray-500 w-8">{idx + 1}.</span>
                       <div className="flex-1">
                         <input 
                           type="date" 
                           value={toDateValue(sch.date)} 
                           onChange={(e) => updateSchedule(idx, e.target.value)}
                           className="w-full p-2 border rounded"
                         />
                       </div>
                       <button type="button" onClick={() => removeSchedule(idx)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded">삭제</button>
                     </div>
                   ))}
                 </div>
               </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center shrink-0">
           {initialUnit && <button type="button" onClick={() => {if(window.confirm('삭제?')) onDelete(initialUnit.id)}} className="text-red-500">삭제</button>}
           <div className="flex gap-2 ml-auto">
             <Button variant="outline" onClick={onClose}>취소</Button>
             
             {/* ✅ [수정] 표준 button 태그로 변경하여 form 연결 확실하게 보장 */}
             <button
               type="submit"
               form="unit-form" // ✅ form ID와 일치
               className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
             >
               저장
             </button>
           </div>
        </div>

      </div>
    </>
  );
};