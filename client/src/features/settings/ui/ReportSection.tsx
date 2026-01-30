// client/src/features/settings/ui/ReportSection.tsx
import { useState, useEffect, ReactElement } from 'react';
import { Button } from '../../../shared/ui';
import { showSuccess, showError } from '../../../shared/utils';
import { apiClient, apiClientJson } from '../../../shared/apiClient';

export const ReportSection = (): ReactElement => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [week, setWeek] = useState(1);
  const [isDownloadingWeekly, setIsDownloadingWeekly] = useState(false);
  const [isDownloadingMonthly, setIsDownloadingMonthly] = useState(false);

  // 사용 가능한 연도 목록 조회
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const years = await apiClientJson<number[]>('/api/v1/reports/years');
        setAvailableYears(years);
        // 현재 연도가 목록에 있으면 선택, 없으면 첫 번째 연도 선택
        if (years.length > 0 && !years.includes(currentYear)) {
          setYear(years[0]);
        }
      } catch {
        // 조회 실패 시 현재 ±1년 사용
        setAvailableYears([currentYear - 1, currentYear, currentYear + 1]);
      }
    };
    fetchYears();
  }, [currentYear]);

  const handleDownloadWeekly = async () => {
    setIsDownloadingWeekly(true);
    try {
      const response = await apiClient(
        `/api/v1/reports/weekly?year=${year}&month=${month}&week=${week}`,
      );

      if (!response.ok) {
        // 서버 에러 메시지 추출
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.message || `${year}년 ${month}월 ${week}주차에 교육 데이터가 없습니다.`;
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // 서버에서 보내는 Content-Disposition 헤더에서 파일명 추출
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${year.toString().slice(-2)}년 ${month}월 ${week}주차 주간 보고서.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (match) filename = decodeURIComponent(match[1]);
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess(`${month}월 ${week}주차 주간 보고서를 다운로드했습니다.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '주간 보고서 다운로드에 실패했습니다.';
      showError(message);
    } finally {
      setIsDownloadingWeekly(false);
    }
  };

  const handleDownloadMonthly = async () => {
    setIsDownloadingMonthly(true);
    try {
      const response = await apiClient(`/api/v1/reports/monthly?year=${year}&month=${month}`);

      if (!response.ok) {
        // 서버 에러 메시지 추출
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `${year}년 ${month}월에 교육 데이터가 없습니다.`;
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // 서버에서 보내는 Content-Disposition 헤더에서 파일명 추출
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${year.toString().slice(-2)}년 ${month}월 월간 보고서.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (match) filename = decodeURIComponent(match[1]);
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess(`${month}월 월간 보고서를 다운로드했습니다.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '월간 보고서 다운로드에 실패했습니다.';
      showError(message);
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
        <div className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">연도</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full h-9 px-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">월</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full h-9 px-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">주차</label>
            <select
              value={week}
              onChange={(e) => setWeek(parseInt(e.target.value))}
              className="w-full h-9 px-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>
                  {w}주
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 주간 보고서 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">주간 보고서</h3>
          <p className="text-xs text-gray-500 mb-3">
            선택한 {month}월 {week}주차의 부대별 교육 현황을 다운로드합니다.
          </p>
          <Button
            variant="primary"
            onClick={handleDownloadWeekly}
            disabled={isDownloadingWeekly}
            fullWidth
          >
            {isDownloadingWeekly ? '다운로드 중...' : '📥 주간 보고서'}
          </Button>
        </div>

        {/* 월간 보고서 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">월간 보고서</h3>
          <p className="text-xs text-gray-500 mb-3">
            선택한 {month}월 한 달간의 전체 교육 현황을 다운로드합니다.
          </p>
          <Button
            variant="primary"
            onClick={handleDownloadMonthly}
            disabled={isDownloadingMonthly}
            fullWidth
          >
            {isDownloadingMonthly ? '다운로드 중...' : '📥 월간 보고서'}
          </Button>
        </div>
      </div>
    </div>
  );
};
