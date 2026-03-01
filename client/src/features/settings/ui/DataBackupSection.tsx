// client/src/features/settings/ui/DataBackupSection.tsx
import { useState, useEffect, ReactElement } from 'react';
import { Button } from '../../../shared/ui';
import { showConfirm, showSuccess, showError, showWarning } from '../../../shared/utils';
import { apiClient, apiClientJson } from '../../../shared/apiClient';

interface DeletePreview {
  year: number | 'all';
  units: number;
  schedules: number;
  assignments: number;
  dispatches: number;
  availabilities: number;
}

interface DatabaseSize {
  usedMB: number;
  limitMB: number;
  percentage: number;
}

export const DataBackupSection = (): ReactElement => {
  const currentYear = new Date().getFullYear();

  // 연도 선택 (null = 전체)
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoadingYears, setIsLoadingYears] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [dbSize, setDbSize] = useState<DatabaseSize | null>(null);

  // 사용 가능한 연도 목록 조회
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const years = await apiClientJson<number[]>('/api/v1/data-backup/years');
        setAvailableYears(years);
      } catch {
        // 조회 실패 시 빈 배열
      } finally {
        setIsLoadingYears(false);
      }
    };
    fetchYears();
  }, []);

  // 데이터베이스 용량 조회
  useEffect(() => {
    const fetchDbSize = async () => {
      try {
        const size = await apiClientJson<DatabaseSize>('/api/v1/data-backup/db-size');
        setDbSize(size);
      } catch {
        // 용량 조회 실패는 무시
      }
    };
    fetchDbSize();
  }, []);

  // 연도 변경 시 미리보기 초기화
  useEffect(() => {
    setPreview(null);
    setBackupConfirmed(false);
  }, [selectedYear]);

  const getYearLabel = () => {
    return selectedYear === 'all' ? '전체' : `${selectedYear}년`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await apiClient(`/api/v1/data-backup/export?year=${selectedYear}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        selectedYear === 'all'
          ? 'T-Lecture_전체_Archive.xlsx'
          : `T-Lecture_${selectedYear}_Archive.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess(`${getYearLabel()} 데이터를 성공적으로 다운로드했습니다.`);
      setBackupConfirmed(false);
    } catch {
      showError('데이터 다운로드에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLoadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const data = await apiClientJson<DeletePreview>(
        `/api/v1/data-backup/preview?year=${selectedYear}`,
      );
      setPreview(data);
    } catch {
      showError('미리보기를 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDelete = async () => {
    if (selectedYear === 'all') {
      showError('전체 데이터 삭제는 허용되지 않습니다. 특정 연도를 선택해주세요.');
      return;
    }

    const yearNum = parseInt(selectedYear, 10);
    if (yearNum >= currentYear) {
      showError('현재 연도는 삭제할 수 없습니다.');
      return;
    }

    if (!backupConfirmed) {
      showWarning('먼저 엑셀 백업을 다운로드하고 확인해주세요.');
      return;
    }

    const confirmed = await showConfirm(
      `정말로 ${selectedYear}년 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await apiClient(`/api/v1/data-backup/cleanup?year=${selectedYear}`, {
        method: 'DELETE',
      });
      showSuccess(`${selectedYear}년 데이터가 삭제되었습니다.`);
      setPreview(null);
      setBackupConfirmed(false);
      // 용량 새로고침
      try {
        const size = await apiClientJson<DatabaseSize>('/api/v1/data-backup/db-size');
        setDbSize(size);
      } catch {
        // ignore
      }
      // 연도 목록 새로고침
      try {
        const years = await apiClientJson<number[]>('/api/v1/data-backup/years');
        setAvailableYears(years);
      } catch {
        // ignore
      }
    } catch {
      showError('데이터 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 용량 바 색상 결정
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 삭제 가능 여부 (전체 또는 현재/미래 연도는 삭제 불가)
  const canDelete = selectedYear !== 'all' && parseInt(selectedYear, 10) < currentYear;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">데이터 백업</h2>
        <p className="text-sm text-gray-500 mt-1">
          연도별 데이터를 엑셀로 백업하고, 저장 공간 확보를 위해 삭제합니다.
        </p>
      </div>

      {/* 연도 선택 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">백업/삭제 대상 연도</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            disabled={isLoadingYears}
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="all">전체</option>
            {availableYears.map((year) => (
              <option key={year} value={year.toString()}>
                {year}년
              </option>
            ))}
          </select>
          {isLoadingYears && <span className="text-sm text-gray-400">로딩 중...</span>}
        </div>
      </div>

      {/* 엑셀 다운로드 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">1단계: 엑셀 백업 다운로드</h3>
        <p className="text-xs text-gray-500 mb-4">
          {getYearLabel()} 데이터를 보고서 형식의 엑셀 파일로 다운로드합니다.
          <br />
          <span className="text-blue-600">(주간보고, 월간 교육일정, 월간 결과보고 3개 시트)</span>
        </p>
        <Button variant="primary" onClick={handleExport} disabled={isExporting}>
          {isExporting ? '다운로드 중...' : `📥 ${getYearLabel()} 데이터 다운로드`}
        </Button>
      </div>

      {/* 삭제 미리보기 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">2단계: 삭제 대상 확인</h3>
        <p className="text-xs text-gray-500 mb-4">삭제될 데이터의 개수를 확인합니다.</p>

        {!preview ? (
          <Button variant="outline" onClick={handleLoadPreview} disabled={isLoadingPreview}>
            {isLoadingPreview ? '불러오는 중...' : '삭제 대상 미리보기'}
          </Button>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">부대</span>
                <span className="font-medium text-gray-800">{preview.units}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">일정</span>
                <span className="font-medium text-gray-800">{preview.schedules}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">배정</span>
                <span className="font-medium text-gray-800">{preview.assignments}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">메시지</span>
                <span className="font-medium text-gray-800">{preview.dispatches}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">강사 가능일</span>
                <span className="font-medium text-gray-800">{preview.availabilities}건</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 삭제 실행 */}
      <div className="bg-red-50 rounded-lg border border-red-200 p-6">
        <h3 className="text-sm font-medium text-red-700 mb-2">3단계: 데이터 삭제</h3>

        {/* 데이터베이스 용량 표시 */}
        {dbSize && (
          <div className="bg-white rounded-lg p-4 mb-4 border border-red-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">데이터베이스 용량</span>
              <span className="text-sm text-gray-600">
                {dbSize.usedMB.toFixed(1)} MB / {dbSize.limitMB >= 1024 ? `${(dbSize.limitMB / 1024).toFixed(0)} GB` : `${dbSize.limitMB} MB`} ({dbSize.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getProgressColor(dbSize.percentage)}`}
                style={{ width: `${Math.min(dbSize.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {!canDelete && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-700">
              {selectedYear === 'all'
                ? '⚠️ 전체 데이터 삭제는 허용되지 않습니다. 특정 연도를 선택해주세요.'
                : `⚠️ ${selectedYear}년은 현재/미래 연도이므로 삭제할 수 없습니다.`}
            </p>
          </div>
        )}

        <p className="text-xs text-red-600 mb-4">
          ⚠️ 삭제된 데이터는 복구할 수 없습니다. 반드시 엑셀 백업을 먼저 받으세요.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="backupConfirm"
            checked={backupConfirmed}
            onChange={(e) => setBackupConfirmed(e.target.checked)}
            disabled={!canDelete}
            className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500"
          />
          <label htmlFor="backupConfirm" className="text-sm text-gray-700">
            엑셀 백업 파일을 안전하게 저장했습니다.
          </label>
        </div>

        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={isDeleting || !backupConfirmed || !preview || !canDelete}
        >
          {isDeleting ? '삭제 중...' : `🗑️ ${getYearLabel()} 데이터 삭제`}
        </Button>
      </div>
    </div>
  );
};
