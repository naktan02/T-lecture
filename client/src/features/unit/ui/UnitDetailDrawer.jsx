import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unitApi } from '../api/unitApi';
import { Button } from '../../../shared/ui/Button';
import { InputField } from '../../../shared/ui/InputField';

// 초기값 상수 정의
const INITIAL_FORM_STATE = {
  name: '', unitType: 'Army', region: '', wideArea: '', addressDetail: '',
  officerName: '', officerPhone: '', officerEmail: '',
  educationStart: '', educationEnd: '', excludedDates: '', // ✅ 추가됨
  workStartTime: '', workEndTime: '',
  lunchStartTime: '', lunchEndTime: ''
};

// 헬퍼 함수들 (안전한 변환)
const toDateValue = (str) => {
  if (!str) return '';
  try { return new Date(str).toISOString().split('T')[0]; } catch { return ''; }
};
const toTimeValue = (str) => {
  if (!str) return '';
  try {
    const d = new Date(str);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  } catch { return ''; }
};

export const UnitDetailDrawer = ({ isOpen, onClose, unit: initialUnit, onSave, onDelete }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [locations, setLocations] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // 상세 데이터 조회
  const { data: detailData } = useQuery({
    queryKey: ['unitDetail', initialUnit?.id],
    queryFn: () => unitApi.getUnit(initialUnit.id),
    enabled: !!initialUnit?.id && isOpen, 
    staleTime: 0,
  });

  // ✅ [중요] 초기화 로직 강화
  useEffect(() => {
    if (isOpen) {
      if (initialUnit) {
        // 수정 모드: 데이터 로딩 대기
        const targetUnit = detailData?.data || initialUnit;
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
          excludedDates: targetUnit.excludedDates || '', // ✅ 추가
          workStartTime: toTimeValue(targetUnit.workStartTime),
          workEndTime: toTimeValue(targetUnit.workEndTime),
          lunchStartTime: toTimeValue(targetUnit.lunchStartTime),
          lunchEndTime: toTimeValue(targetUnit.lunchEndTime),
        });
        setLocations(targetUnit.trainingLocations || []);
        setSchedules(targetUnit.schedules || []);
      } else {
        // ✅ 신규 등록 모드: 완전 초기화
        setFormData(INITIAL_FORM_STATE);
        setLocations([]);
        setSchedules([]);
      }
      setActiveTab('basic'); // 탭도 초기화
    }
  }, [isOpen, initialUnit, detailData]);

  const handleBasicChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ... (Location, Schedule 관련 핸들러는 기존 코드 유지 - 생략 없이 사용)
  const addLocation = () => setLocations([...locations, { id: null, originalPlace: '', plannedCount: 0 }]);
  const updateLocation = (idx, field, val) => { const newLocs = [...locations]; newLocs[idx][field] = val; setLocations(newLocs); };
  const removeLocation = (idx) => setLocations(locations.filter((_, i) => i !== idx));
  const addSchedule = () => setSchedules([...schedules, { id: null, date: toDateValue(new Date()) }]);
  const updateSchedule = (idx, val) => { const newSchs = [...schedules]; newSchs[idx].date = val; setSchedules(newSchs); };
  const removeSchedule = (idx) => setSchedules(schedules.filter((_, i) => i !== idx));

  // ✅ 저장 핸들러 (필수값 검증 포함)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. 필수값 검증
    const requiredFields = [
      'name', 'unitType', 'wideArea', 'region', 'addressDetail', 
      'educationStart', 'educationEnd', 
      'workStartTime', 'workEndTime', 'lunchStartTime', 'lunchEndTime',
      'officerName', 'officerPhone', 'officerEmail'
    ];
    
    // excludedDates는 선택값이므로 제외
    const emptyField = requiredFields.find(field => !formData[field]);
    if (emptyField) {
      alert(`모든 필드는 필수입니다. (${emptyField} 누락됨)`);
      return;
    }

    // 2. 데이터 변환
    const makeDateTime = (timeStr) => {
      if (!timeStr) return null;
      const d = new Date();
      const [h, m] = timeStr.split(':').map(Number);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
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
      // Schedules는 폼에서 직접 수정한 것만 보냄 (서버 자동 계산을 원하면 제거 가능하지만, 여기선 수동 수정 우선)
      schedules: schedules.map(s => ({ ...s, date: makeDate(s.date) })),
    };

    try {
      if (initialUnit) await onSave({ id: initialUnit.id, data: payload });
      else await onSave(payload);
      onClose();
    } catch (error) {
      console.error(error);
      alert("저장에 실패했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[700px] bg-white shadow-2xl flex flex-col h-full">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{initialUnit ? formData.name : '신규 부대 등록'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 shrink-0">
          {['basic', 'location', 'schedule'].map(tab => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500'}`}>
              {tab === 'basic' ? '기본 정보' : tab === 'location' ? `교육 장소 (${locations.length})` : `일정 (${schedules.length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form id="unit-form" onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* 기본 정보 섹션 */}
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">🏢 기본 정보 (모두 필수)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="부대명" name="name" value={formData.name} onChange={handleBasicChange} required />
                    <div>
                      <label className="text-sm font-medium text-gray-700">군 구분 *</label>
                      <select name="unitType" value={formData.unitType} onChange={handleBasicChange} className="w-full mt-1 p-2 border rounded-lg">
                        <option value="Army">육군</option><option value="Navy">해군</option><option value="AirForce">공군</option><option value="Marine">해병대</option>
                      </select>
                    </div>
                    <InputField label="광역" name="wideArea" value={formData.wideArea} onChange={handleBasicChange} required />
                    <InputField label="지역" name="region" value={formData.region} onChange={handleBasicChange} required />
                    <div className="col-span-2">
                        <InputField label="상세주소" name="addressDetail" value={formData.addressDetail} onChange={handleBasicChange} required />
                    </div>
                  </div>
                </section>

                {/* 운영 시간 섹션 */}
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">⏰ 운영 및 일정 (모두 필수)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField type="date" label="교육 시작" name="educationStart" value={formData.educationStart} onChange={handleBasicChange} required />
                    <InputField type="date" label="교육 종료" name="educationEnd" value={formData.educationEnd} onChange={handleBasicChange} required />
                    
                    <div className="col-span-2">
                      <InputField label="교육 불가 일자 (예: 2024-12-25, 2024-12-26)" name="excludedDates" value={formData.excludedDates} onChange={handleBasicChange} placeholder="콤마(,)로 구분" />
                    </div>

                    <div className="border-t col-span-2 my-2"></div>

                    <InputField type="time" label="근무 시작" name="workStartTime" value={formData.workStartTime} onChange={handleBasicChange} required />
                    <InputField type="time" label="근무 종료" name="workEndTime" value={formData.workEndTime} onChange={handleBasicChange} required />
                    <InputField type="time" label="점심 시작" name="lunchStartTime" value={formData.lunchStartTime} onChange={handleBasicChange} required />
                    <InputField type="time" label="점심 종료" name="lunchEndTime" value={formData.lunchEndTime} onChange={handleBasicChange} required />
                  </div>
                </section>

                {/* 담당자 섹션 */}
                <section className="bg-white p-5 rounded-xl border shadow-sm">
                  <h3 className="font-bold mb-4">📞 담당자 (모두 필수)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="이름" name="officerName" value={formData.officerName} onChange={handleBasicChange} required />
                    <InputField label="연락처" name="officerPhone" value={formData.officerPhone} onChange={handleBasicChange} required />
                    <div className="col-span-2">
                        <InputField label="이메일" name="officerEmail" value={formData.officerEmail} onChange={handleBasicChange} required />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* 나머지 탭 렌더링 (기존 로직 유지) */}
            {activeTab === 'location' && (
               <div className="space-y-4">
                 <div className="flex justify-between mb-4"><Button type="button" onClick={addLocation} size="small">+ 추가</Button></div>
                 {locations.map((loc, idx) => (
                   <div key={idx} className="bg-white p-4 rounded border mb-4">
                     <InputField label="장소명" value={loc.originalPlace} onChange={(e)=>updateLocation(idx,'originalPlace',e.target.value)} />
                     <button type="button" onClick={()=>removeLocation(idx)} className="text-red-500 text-sm mt-2">삭제</button>
                   </div>
                 ))}
               </div>
            )}
            {activeTab === 'schedule' && (
               <div className="space-y-4">
                 <p className="text-sm text-gray-500 mb-2">※ 엑셀 업로드 시에는 날짜가 자동 계산되지만, 여기서는 수동으로 관리됩니다.</p>
                 <div className="flex justify-between mb-4"><Button type="button" onClick={addSchedule} size="small">+ 추가</Button></div>
                 {schedules.map((sch, idx) => (
                   <div key={idx} className="flex gap-2 mb-2">
                     <input type="date" className="border p-2 rounded flex-1" value={toDateValue(sch.date)} onChange={(e)=>updateSchedule(idx,e.target.value)} />
                     <button type="button" onClick={()=>removeSchedule(idx)} className="text-red-500">삭제</button>
                   </div>
                 ))}
               </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center shrink-0">
           {initialUnit && <button type="button" onClick={() => {if(window.confirm('삭제하시겠습니까?')) onDelete(initialUnit.id)}} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded">삭제</button>}
           <div className="flex gap-2 ml-auto">
             <Button variant="outline" onClick={onClose}>취소</Button>
             <button type="submit" form="unit-form" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">저장</button>
           </div>
        </div>
      </div>
    </>
  );
};