import React, { useState, useEffect } from 'react';
import { Button } from '../../../shared/ui/Button';
import { InputField } from '../../../shared/ui/InputField';

// 헬퍼: ISO 날짜 문자열에서 YYYY-MM-DD 추출
const toDateValue = (isoStr) => {
  if (!isoStr) return '';
  return new Date(isoStr).toISOString().split('T')[0];
};

// 헬퍼: ISO 날짜 문자열에서 HH:mm 추출
const toTimeValue = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export const UnitDetailDrawer = ({ isOpen, onClose, unit, onSave, onDelete }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (unit) {
        setFormData({
          name: unit.name || '',
          unitType: unit.unitType || 'Army',
          region: unit.region || '',
          wideArea: unit.wideArea || '',
          addressDetail: unit.addressDetail || '',
          officerName: unit.officerName || '',
          officerPhone: unit.officerPhone || '',
          officerEmail: unit.officerEmail || '',
          educationStart: toDateValue(unit.educationStart),
          educationEnd: toDateValue(unit.educationEnd),
          workStartTime: toTimeValue(unit.workStartTime),
          workEndTime: toTimeValue(unit.workEndTime),
          lunchStartTime: toTimeValue(unit.lunchStartTime),
          lunchEndTime: toTimeValue(unit.lunchEndTime),
        });
      } else {
        // 신규 등록 초기값
        setFormData({
          name: '', unitType: 'Army', region: '', wideArea: '', addressDetail: '',
          officerName: '', officerPhone: '', officerEmail: '',
          educationStart: '', educationEnd: '',
          workStartTime: '09:00', workEndTime: '18:00',
          lunchStartTime: '12:00', lunchEndTime: '13:00',
        });
      }
    }
  }, [unit, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 시간 문자열(HH:mm)을 오늘 날짜 기준 ISO String으로 변환
    const toIsoDateTime = (timeStr) => {
      if (!timeStr) return null;
      const now = new Date();
      const [h, m] = timeStr.split(':').map(Number);
      now.setHours(h, m, 0, 0);
      return now.toISOString();
    };

    const submitData = {
      ...formData,
      workStartTime: toIsoDateTime(formData.workStartTime),
      workEndTime: toIsoDateTime(formData.workEndTime),
      lunchStartTime: toIsoDateTime(formData.lunchStartTime),
      lunchEndTime: toIsoDateTime(formData.lunchEndTime),
      // 날짜 필드는 그대로 보냄 (백엔드에서 처리)
    };

    if (unit) onSave({ id: unit.id, data: submitData });
    else onSave(submitData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[600px] bg-white shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold">{unit ? '부대 상세 정보' : '신규 부대 등록'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form id="unit-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. 기본 정보 */}
            <section className="bg-white p-5 rounded-xl border shadow-sm">
              <h3 className="font-bold mb-4 text-gray-800">🏢 기본 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <InputField label="부대명" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">군 구분</label>
                  <select name="unitType" value={formData.unitType} onChange={handleChange} className="w-full p-2 border rounded-lg">
                    <option value="Army">육군</option>
                    <option value="Navy">해군</option>
                  </select>
                </div>
                <InputField label="지역(광역)" name="wideArea" value={formData.wideArea} onChange={handleChange} />
                <InputField label="지역(시/군)" name="region" value={formData.region} onChange={handleChange} />
                <div className="col-span-2">
                   <InputField label="상세 주소" name="addressDetail" value={formData.addressDetail} onChange={handleChange} />
                </div>
              </div>
            </section>

            {/* 2. 교육 및 근무 시간 (테이블 필드 모두 표시) */}
            <section className="bg-white p-5 rounded-xl border shadow-sm">
              <h3 className="font-bold mb-4 text-gray-800">⏰ 일정 및 시간</h3>
              <div className="grid grid-cols-2 gap-4">
                <InputField type="date" label="교육 시작일" name="educationStart" value={formData.educationStart} onChange={handleChange} />
                <InputField type="date" label="교육 종료일" name="educationEnd" value={formData.educationEnd} onChange={handleChange} />
                
                <div className="col-span-2 border-t my-2"></div>
                
                <InputField type="time" label="근무 시작" name="workStartTime" value={formData.workStartTime} onChange={handleChange} />
                <InputField type="time" label="근무 종료" name="workEndTime" value={formData.workEndTime} onChange={handleChange} />
                
                <InputField type="time" label="점심 시작" name="lunchStartTime" value={formData.lunchStartTime} onChange={handleChange} />
                <InputField type="time" label="점심 종료" name="lunchEndTime" value={formData.lunchEndTime} onChange={handleChange} />
              </div>
            </section>

            {/* 3. 담당자 정보 */}
            <section className="bg-white p-5 rounded-xl border shadow-sm">
              <h3 className="font-bold mb-4 text-gray-800">📞 담당자 정보</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="성함" name="officerName" value={formData.officerName} onChange={handleChange} />
                  <InputField label="연락처" name="officerPhone" value={formData.officerPhone} onChange={handleChange} />
                </div>
                <InputField label="이메일" name="officerEmail" value={formData.officerEmail} onChange={handleChange} />
              </div>
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
          {unit && (
            <button type="button" onClick={() => {if(window.confirm('삭제하시겠습니까?')) onDelete(unit.id)}} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded">
              삭제
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>취소</Button>
            <Button variant="primary" type="submit" form="unit-form">저장</Button>
          </div>
        </div>
      </div>
    </>
  );
};