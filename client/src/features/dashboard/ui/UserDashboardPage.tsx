// client/src/features/dashboard/ui/UserDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { dashboardApi, DashboardStats } from '../api/dashboardApi';
import {
  ClockIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
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
  <div className={`rounded-xl border p-5 ${colorStyles[color]} transition-all hover:shadow-md`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium opacity-80">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {subtitle && <p className="mt-1 text-xs opacity-70">{subtitle}</p>}
      </div>
      <div className="rounded-full bg-white/60 p-3">{icon}</div>
    </div>
  </div>
);

// 월별 활동 차트 (간단한 바 차트)
interface MonthlyChartProps {
  data: DashboardStats['monthlyTrend'];
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <ChartBarIcon className="h-5 w-5 text-gray-600" />
        <h3 className="font-semibold text-gray-800">월별 활동 추이</h3>
      </div>
      <div className="flex h-40 items-end justify-around gap-2">
        {data.map((item) => {
          const height = (item.count / maxCount) * 100;
          const monthLabel = item.month.split('-')[1] + '월';
          return (
            <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-600">{item.count}건</span>
              <div
                className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-blue-500 to-blue-400 transition-all"
                style={{ height: `${Math.max(height, 4)}%` }}
              />
              <span className="text-xs text-gray-500">{monthLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 최근 배정 리스트
interface RecentAssignmentsProps {
  assignments: DashboardStats['recentAssignments'];
}

const RecentAssignments: React.FC<RecentAssignmentsProps> = ({ assignments }) => {
  if (assignments.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">최근 배정</h3>
        </div>
        <EmptyState title="최근 배정 내역이 없습니다." />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDaysIcon className="h-5 w-5 text-gray-600" />
        <h3 className="font-semibold text-gray-800">최근 배정</h3>
      </div>
      <div className="space-y-3">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-800">{assignment.unitName}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                <span>{assignment.date}</span>
                {assignment.region && <span>• {assignment.region}</span>}
                {assignment.unitType && (
                  <span className="rounded bg-gray-200 px-1.5 py-0.5">{assignment.unitType}</span>
                )}
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-gray-600">{assignment.workHours}시간</p>
              <p className="text-xs text-gray-400">{assignment.distance}km</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 메인 대시보드 페이지
export const UserDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 날짜 필터 상태
  const [rangeType, setRangeType] = useState<string>('all'); // 'all', '1m', '3m', 'custom'
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    // 필터 변경 시 날짜 자동 설정
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (rangeType === '1m') {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 1);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    } else if (rangeType === '3m') {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 3);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    } else if (rangeType === 'all') {
      setStartDate('');
      setEndDate('');
    }
    // custom일 때는 기존 값 유지
  }, [rangeType]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        // custom이고 날짜가 없으면 요청 안함 (혹은 전체로?)
        if (rangeType === 'custom' && (!startDate || !endDate)) {
          // 날짜 선택 대기
          setIsLoading(false);
          return;
        }

        const data = await dashboardApi.getUserStats({
          startDate: rangeType !== 'all' ? startDate : undefined,
          endDate: rangeType !== 'all' ? endDate : undefined,
        });
        setStats(data);
      } catch (err) {
        console.error(err);
        setError('통계 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    // custom일 때는 날짜가 둘 다 있을 때만 요청
    if (rangeType !== 'custom' || (startDate && endDate)) {
      fetchStats();
    }
  }, [rangeType, startDate, endDate]);

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
    <div className="space-y-6 p-4 md:p-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-1 text-sm text-gray-500">나의 활동 통계 현황</p>
        </div>

        {/* 날짜 필터 컨트롤 */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">전체 기간 (누적)</option>
            <option value="1m">최근 1개월</option>
            <option value="3m">최근 3개월</option>
            <option value="custom">직접 설정</option>
          </select>

          {rangeType === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="총 근무 시간"
              value={`${stats.summary.totalWorkHours}시간`}
              subtitle={rangeType === 'all' ? '누적 완료된 교육 시간' : '선택 기간 내 교육 시간'}
              icon={<ClockIcon className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="총 이동 거리"
              value={`${stats.summary.totalDistance}km`}
              subtitle={
                rangeType === 'all' ? '부대 방문 누적 거리 (왕복)' : '선택 기간 내 이동 거리'
              }
              icon={<MapPinIcon className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="배정 수락률"
              value={`${stats.performance.acceptanceRate}%`}
              subtitle={`${stats.performance.acceptedCount}/${stats.performance.totalProposals} 건`}
              icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
              color="purple"
            />
            <StatCard
              title="근무 일수"
              value={`${stats.summary.totalWorkDays}일`}
              subtitle={
                rangeType === 'all'
                  ? `올해 ${stats.summary.yearCount}건 / 이번달 ${stats.summary.monthCount}건`
                  : '선택 기간 내 근무일수'
              }
              icon={<CheckCircleIcon className="h-6 w-6" />}
              color="orange"
            />
          </div>

          {/* 차트 및 리스트 섹션 */}
          <div className="grid gap-6 lg:grid-cols-2">
            <MonthlyChart data={stats.monthlyTrend} />
            <RecentAssignments assignments={stats.recentAssignments} />
          </div>
        </>
      )}
    </div>
  );
};

export default UserDashboardPage;
