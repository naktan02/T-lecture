// client/src/features/settings/ui/ReportSection.tsx
import { useState, ReactElement } from 'react';
import { Button } from '../../../shared/ui';
import { showSuccess, showError } from '../../../shared/utils';
import { apiClient } from '../../../shared/apiClient';

export const ReportSection = (): ReactElement => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [week, setWeek] = useState(1);
  const [isDownloadingWeekly, setIsDownloadingWeekly] = useState(false);
  const [isDownloadingMonthly, setIsDownloadingMonthly] = useState(false);

  const handleDownloadWeekly = async () => {
    setIsDownloadingWeekly(true);
    try {
      const response = await apiClient(
        `/api/v1/reports/weekly?year=${year}&month=${month}&week=${week}`,
      );

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Weekly_Report_${year}_${month}_${week}w.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess(`${month}월 ${week}주차 주간 보고서를 다운로드했습니다.`);
    } catch {
      showError('주간 보고서 다운로드에 실패했습니다.');
    } finally {
      setIsDownloadingWeekly(false);
    }
  };

  const handleDownloadMonthly = async () => {
    setIsDownloadingMonthly(true);
    try {
      const response = await apiClient(`/api/v1/reports/monthly?year=${year}&month=${month}`);

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Monthly_Report_${year}_${month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess(`${month}월 월간 보고서를 다운로드했습니다.`);
    } catch {
      showError('월간 보고서 다운로드에 실패했습니다.');
    } finally {
      setIsDownloadingMonthly(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">보고서 다운로드</h2>
        <p className="text-sm text-gray-500 mt-1">
          주간 및 월간 교육 결과 보고서를 엑셀 형식으로 다운로드합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 날짜 선택 섹션 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">월</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">주차</label>
            <select
              value={week}
              onChange={(e) => setWeek(parseInt(e.target.value))}
              className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>
                  {w}주차
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 주간 보고서 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">주간 보고서</h3>
              <p className="text-xs text-gray-500">
                선택한 {month}월 {week}주차의 부대별 교육 현황을 다운로드합니다.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleDownloadWeekly}
              disabled={isDownloadingWeekly}
              className="min-w-[140px]"
            >
              {isDownloadingWeekly ? '다운로드 중...' : '📥 주간 보고서'}
            </Button>
          </div>
        </div>

        {/* 월간 보고서 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">월간 보고서</h3>
              <p className="text-xs text-gray-500">
                선택한 {month}월 한 달간의 전체 교육 현황을 다운로드합니다.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleDownloadMonthly}
              disabled={isDownloadingMonthly}
              className="min-w-[140px]"
            >
              {isDownloadingMonthly ? '다운로드 중...' : '📥 월간 보고서'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
