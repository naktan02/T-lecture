// client/src/features/dashboard/ui/UserDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { dashboardApi, DashboardStats, PaginatedActivities } from '../api/dashboardApi';
import { getMilitaryTypeLabel } from '@/shared/types/unit.types';
import {
  ClockIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { LoadingSpinner, EmptyState } from '@/shared/ui';

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
};

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => (
  <div
    className={`rounded-xl border p-4 md:p-5 ${colorStyles[color]} transition-all hover:shadow-md`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] md:text-sm font-medium opacity-80">{title}</p>
        <p className="mt-0.5 md:mt-1 text-lg md:text-2xl font-bold">{value}</p>
        {subtitle && <p className="mt-0.5 md:mt-1 text-[9px] md:text-xs opacity-70">{subtitle}</p>}
      </div>
      <div className="rounded-full bg-white/60 p-2 md:p-3 shrink-0 ml-2">{icon}</div>
    </div>
  </div>
);

// 월별 활동 차트 (간단한 바 차트)
interface MonthlyChartProps {
  data: DashboardStats['monthlyTrend'];
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 100; // 차트 막대 영역 최대 높이 (px) - 모바일에 맞춰 약간 축소

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        <ChartBarIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
        <h3 className="text-sm md:text-base font-semibold text-gray-800">월별 활동 추이</h3>
      </div>
      <div
        className="flex items-end justify-around gap-1"
        style={{ height: `${chartHeight + 35}px` }}
      >
        {data.map((item) => {
          // 픽셀 기반 높이 계산 (0건이면 2px 최소 높이)
          const barHeight = item.count > 0 ? Math.max((item.count / maxCount) * chartHeight, 6) : 2;
          const monthLabel = item.month.split('-')[1] + '월';
          return (
            <div key={item.month} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] md:text-xs font-medium text-gray-600">{item.count}</span>
              <div
                className="w-full max-w-[24px] md:max-w-[32px] rounded-t-sm md:rounded-t-md bg-gradient-to-t from-blue-500 to-blue-400"
                style={{ height: `${barHeight}px` }}
              />
              <span className="text-[10px] md:text-xs text-gray-500">{monthLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 활동 내역 리스트 (기간별 조회 가능, 페이징 포함)
interface ActivityHistoryProps {
  assignments: DashboardStats['recentAssignments'];
  rangeLabel: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  totalCount: number;
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({
  assignments,
  rangeLabel,
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
  totalCount,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
          <h3 className="text-sm md:text-base font-semibold text-gray-800">활동 내역</h3>
        </div>
        <span className="text-[10px] md:text-xs text-gray-400">
          {rangeLabel} ({totalCount}건)
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState title="해당 기간의 활동 내역이 없습니다." />
      ) : (
        <>
          <div className="space-y-2 md:space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 md:p-3 transition-colors hover:bg-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-medium text-gray-800 truncate">
                    {assignment.unitName}
                  </p>
                  <div className="mt-0.5 md:mt-1 flex flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-1 text-[10px] md:text-xs text-gray-500">
                    <span>{assignment.date}</span>
                    {assignment.region && (
                      <span className="hidden sm:inline">• {assignment.region}</span>
                    )}
                    {assignment.unitType && (
                      <span className="rounded bg-gray-200 px-1 py-0.5">
                        {getMilitaryTypeLabel(assignment.unitType)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-[11px] md:text-sm ml-2 shrink-0">
                  <p className="text-gray-600 font-medium">{assignment.workHours}H</p>
                  <p className="text-[10px] md:text-xs text-gray-400">{assignment.distance}km</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1 md:gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-lg p-1.5 md:p-2 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
              >
                <ChevronLeftIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
              <div className="flex items-center gap-0.5 md:gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                    }
                    if (pageNum > totalPages) {
                      pageNum = totalPages - 4 + i;
                    }
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`h-7 w-7 md:h-8 md:w-8 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-lg p-1.5 md:p-2 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
              >
                <ChevronRightIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// 메인 대시보드 페이지
export const UserDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activitiesData, setActivitiesData] = useState<PaginatedActivities | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 날짜 필터 상태
  const [rangeType, setRangeType] = useState<string>('1m'); // '1m', '3m', '6m', '12m', 'custom'
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  useEffect(() => {
    // 필터 변경 시 날짜 자동 설정 (월 단위 - UI 표시용)
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    if (rangeType === 'custom') {
      // custom일 때는 기존 값 유지
      return;
    }

    let startMonth: number;
    let startYear: number;

    switch (rangeType) {
      case '1m':
        // 이번 달만
        startMonth = currentMonth;
        startYear = currentYear;
        break;
      case '3m':
        // 최근 3개월 (이번 달 포함)
        startMonth = currentMonth - 2;
        startYear = currentYear;
        break;
      case '6m':
        // 최근 6개월
        startMonth = currentMonth - 5;
        startYear = currentYear;
        break;
      case '12m':
        // 최근 12개월
        startMonth = currentMonth - 11;
        startYear = currentYear;
        break;
      default:
        startMonth = currentMonth;
        startYear = currentYear;
    }

    // 음수 월 처리 (연도 조정)
    while (startMonth < 0) {
      startMonth += 12;
      startYear -= 1;
    }

    // 시작일: 해당 월의 1일
    const start = new Date(startYear, startMonth, 1);

    // 종료일: 이번 달의 마지막 날
    const end = new Date(currentYear, currentMonth + 1, 0);

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  }, [rangeType]);

  useEffect(() => {
    // 1. 기간 변경 시 페이지 초기화
    setPage(1);
  }, [rangeType, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      // custom이고 날짜가 없으면 요청 안함
      if (rangeType === 'custom' && (!startDate || !endDate)) {
        if (!controller.signal.aborted) setIsLoading(false);
        return;
      }

      const params: any = {};
      if (rangeType === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.period = rangeType;
      }

      try {
        setIsLoading(true);
        // 통계와 첫 페이지 활동 내역 동시 요청
        const [statsRes, activitiesRes] = await Promise.all([
          dashboardApi.getUserStats(params, controller.signal),
          dashboardApi.getUserActivities({ ...params, page: 1, limit: LIMIT }, controller.signal),
        ]);

        if (!controller.signal.aborted) {
          setStats(statsRes);
          setActivitiesData(activitiesRes);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error(err);
          setError('데이터를 불러오는데 실패했습니다.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    if (rangeType !== 'custom' || (startDate && endDate)) {
      fetchData();
    }

    return () => {
      controller.abort();
    };
  }, [rangeType, startDate, endDate]);

  // 페이지 변경 시 활동 내역만 별도 로드
  const fetchActivitiesPage = async (newPage: number) => {
    if (rangeType === 'custom' && (!startDate || !endDate)) return;

    const params: any = { page: newPage, limit: LIMIT };
    if (rangeType === 'custom') {
      params.startDate = startDate;
      params.endDate = endDate;
    } else {
      params.period = rangeType;
    }

    try {
      setIsActivitiesLoading(true);
      const data = await dashboardApi.getUserActivities(params);
      setActivitiesData(data);
      setPage(newPage);
    } catch (err) {
      console.error(err);
    } finally {
      setIsActivitiesLoading(false);
    }
  };

  if (isLoading && !stats) {
    // stats가 있으면(갱신 중이면) 로딩 안보여줌 (스켈레톤 대신 기존 데이터 유지)
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 md:gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">대시보드</h1>
            {(isLoading || isActivitiesLoading) && stats && (
              <div className="flex items-center gap-1.5 md:gap-2 rounded-full bg-blue-50 px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-medium text-blue-600">
                <div className="h-2.5 w-2.5 md:h-3 md:w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="md:inline">업데이트 중...</span>
              </div>
            )}
          </div>
          <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-gray-500">나의 활동 통계 현황</p>
        </div>

        {/* 날짜 필터 컨트롤 */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <select
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value)}
            className="flex-1 sm:flex-none rounded-lg border border-gray-300 bg-white px-3 py-1.5 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="1m">최근 1개월</option>
            <option value="3m">최근 3개월</option>
            <option value="6m">최근 6개월</option>
            <option value="12m">최근 12개월</option>
            <option value="custom">직접 설정</option>
          </select>

          {rangeType === 'custom' && (
            <div className="flex items-center gap-1.5 md:gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 md:py-2 text-xs md:text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {!stats ? (
        rangeType === 'custom' ? (
          <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500">
            조회할 기간을 선택해주세요.
          </div>
        ) : null
      ) : (
        <>
          {/* 요약 카드 섹션 */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="총 근무 시간"
              value={`${stats.summary.totalWorkHours}시간`}
              subtitle={'선택 기간 내 교육 시간'}
              icon={<ClockIcon className="h-4 w-4 md:h-6 md:w-6" />}
              color="blue"
            />
            <StatCard
              title="총 이동 거리"
              value={`${stats.summary.totalDistance}km`}
              subtitle={'선택 기간 내 이동 거리'}
              icon={<MapPinIcon className="h-4 w-4 md:h-6 md:w-6" />}
              color="green"
            />
            <StatCard
              title="배정 수락률"
              value={`${stats.performance.acceptanceRate}%`}
              subtitle={`${stats.performance.acceptedCount}/${stats.performance.totalProposals} 건`}
              icon={<ArrowTrendingUpIcon className="h-4 w-4 md:h-6 md:w-6" />}
              color="purple"
            />
            <StatCard
              title="근무 일수"
              value={`${stats.summary.totalWorkDays}일`}
              subtitle={'선택 기간 내 근무일수'}
              icon={<CheckCircleIcon className="h-4 w-4 md:h-6 md:w-6" />}
              color="orange"
            />
          </div>

          {/* 차트 및 리스트 섹션 - 항상 세로 배치 */}
          <div className="grid gap-6">
            <MonthlyChart data={stats.monthlyTrend} />
            <ActivityHistory
              assignments={activitiesData?.activities || []}
              rangeLabel={
                rangeType === 'custom'
                  ? `${startDate} ~ ${endDate}`
                  : rangeType === '1m'
                    ? '최근 1개월'
                    : rangeType === '3m'
                      ? '최근 3개월'
                      : rangeType === '6m'
                        ? '최근 6개월'
                        : '최근 12개월'
              }
              currentPage={page}
              totalPages={activitiesData?.pagination.totalPages || 1}
              onPageChange={fetchActivitiesPage}
              isLoading={isActivitiesLoading}
              totalCount={activitiesData?.pagination.total || 0}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default UserDashboardPage;
