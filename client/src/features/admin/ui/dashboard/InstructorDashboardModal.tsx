import React, { useEffect, useState } from 'react';
import {
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/shared/apiClient';
import { getMilitaryTypeLabel } from '@/shared/types/unit.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  instructorId: number;
  instructorName: string;
}

// 활동 내역 일자 정보
interface ActivityDate {
  date: string;
  workHours: number;
}

// 활동 내역 (교육 기간 단위)
interface ActivityGroup {
  trainingPeriodId: number;
  unitName: string;
  unitType: string | null;
  region: string | null;
  trainingPeriodName: string;
  distance: number;
  totalWorkHours: number;
  dates: ActivityDate[];
}

interface DashboardStats {
  summary: {
    totalWorkHours: number;
    totalDistance: number;
    totalWorkDays: number;
    periodCount: number;
  };
  performance: {
    rejectionRate: number;
    totalProposals: number;
    rejectedCount: number;
  };
  monthlyTrend: { month: string; count: number; hours: number }[];
  recentActivities: ActivityGroup[];
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
};

// 활동 그룹 아이템 컴포넌트
interface ActivityGroupItemProps {
  activity: ActivityGroup;
  isExpanded: boolean;
  onToggle: () => void;
}

const ActivityGroupItem: React.FC<ActivityGroupItemProps> = ({
  activity,
  isExpanded,
  onToggle,
}) => {
  const dateRange =
    activity.dates.length > 1
      ? `${activity.dates[activity.dates.length - 1].date} ~ ${activity.dates[0].date}`
      : activity.dates[0]?.date || '';

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-800 truncate">{activity.unitName}</p>
            {activity.trainingPeriodName && (
              <span className="text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded shrink-0">
                {activity.trainingPeriodName}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDaysIcon className="h-3 w-3" />
              {dateRange} ({activity.dates.length}일)
            </span>
            {activity.region && <span>• {activity.region}</span>}
            {activity.unitType && (
              <span className="rounded bg-gray-200 px-1 py-0.5">
                {getMilitaryTypeLabel(activity.unitType)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 ml-2 shrink-0">
          <div className="text-right text-sm">
            <p className="text-gray-600 font-medium">{activity.totalWorkHours}H</p>
            <p className="text-xs text-gray-400">{activity.distance}km</p>
          </div>
          {isExpanded ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-white p-3">
          <div className="text-[10px] text-gray-500 mb-2">일자별 근무 내역</div>
          <div className="space-y-1">
            {activity.dates.map((dateInfo) => (
              <div
                key={dateInfo.date}
                className="flex items-center justify-between px-2 py-1.5 rounded bg-gray-50"
              >
                <span className="text-xs text-gray-700">{dateInfo.date}</span>
                <span className="text-xs font-medium text-gray-600">{dateInfo.workHours}시간</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const InstructorDashboardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onBack,
  instructorId,
  instructorName,
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Filter states
  const [rangeType, setRangeType] = useState<string>('12m');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Date calculation effect
  useEffect(() => {
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
    } else if (rangeType === '6m') {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 6);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    } else if (rangeType === '12m') {
      const start = new Date(today);
      start.setMonth(today.getMonth() - 12);
      setStartDate(formatDate(start));
      setEndDate(formatDate(today));
    }
  }, [rangeType]);

  useEffect(() => {
    if (!isOpen || !instructorId) return;

    if (rangeType === 'custom' && (!startDate || !endDate)) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setExpandedIds(new Set());

      try {
        const query = new URLSearchParams();
        if (rangeType === 'custom') {
          query.append('startDate', startDate);
          query.append('endDate', endDate);
        } else {
          query.append('period', rangeType);
        }

        const res = await apiClient(
          `/api/v1/dashboard/admin/instructors/${instructorId}/dashboard?${query.toString()}`,
        );
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터 로딩 실패');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, instructorId, rangeType, startDate, endDate]);

  if (!isOpen) return null;

  const getRangeLabel = () => {
    if (rangeType === 'custom') return `${startDate} ~ ${endDate}`;
    if (rangeType === '1m') return '최근 1개월';
    if (rangeType === '3m') return '최근 3개월';
    if (rangeType === '6m') return '최근 6개월';
    return '최근 12개월';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                  title="뒤로가기"
                >
                  ←
                </button>
              )}
              <h3 className="text-xl font-bold text-gray-900">{instructorName} 대시보드</h3>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <select
                value={rangeType}
                onChange={(e) => setRangeType(e.target.value)}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="1m">최근 1개월</option>
                <option value="3m">최근 3개월</option>
                <option value="6m">최근 6개월</option>
                <option value="12m">최근 12개월</option>
                <option value="custom">직접 설정</option>
              </select>

              {rangeType === 'custom' && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-gray-400">~</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <p className="text-center text-red-500 py-12">{error}</p>
          ) : !stats ? (
            <p className="text-center text-gray-500 py-12">데이터를 불러올 수 없습니다.</p>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`rounded-xl border p-5 ${colorStyles.blue}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-80">총 근무 시간</p>
                      <p className="mt-1 text-2xl font-bold">{stats.summary.totalWorkHours}시간</p>
                      <p className="text-xs opacity-70">{stats.summary.periodCount}건의 교육</p>
                    </div>
                    <div className="rounded-full bg-white/60 p-3">
                      <ClockIcon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
                <div className={`rounded-xl border p-5 ${colorStyles.green}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-80">총 이동 거리</p>
                      <p className="mt-1 text-2xl font-bold">{stats.summary.totalDistance}km</p>
                      <p className="text-xs opacity-70">왕복 기준</p>
                    </div>
                    <div className="rounded-full bg-white/60 p-3">
                      <MapPinIcon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
                <div className={`rounded-xl border p-5 ${colorStyles.purple}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-80">배정 거절률</p>
                      <p className="mt-1 text-2xl font-bold">{stats.performance.rejectionRate}%</p>
                      <p className="text-xs opacity-70">
                        {stats.performance.rejectedCount}/{stats.performance.totalProposals}건
                      </p>
                    </div>
                    <div className="rounded-full bg-white/60 p-3">
                      <ArrowTrendingUpIcon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
                <div className={`rounded-xl border p-5 ${colorStyles.orange}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-80">근무 일수</p>
                      <p className="mt-1 text-2xl font-bold">{stats.summary.totalWorkDays}일</p>
                      <p className="text-xs opacity-70">선택 기간 내</p>
                    </div>
                    <div className="rounded-full bg-white/60 p-3">
                      <CheckCircleIcon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Trend Chart */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ChartBarIcon className="h-5 w-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-800">월별 활동 추이</h4>
                </div>
                <div className="flex items-end justify-around gap-2 h-32">
                  {stats.monthlyTrend.map((item) => {
                    const maxCount = Math.max(...stats.monthlyTrend.map((d) => d.count), 1);
                    const barHeight =
                      item.count > 0 ? Math.max((item.count / maxCount) * 100, 8) : 4;
                    const monthLabel = item.month.split('-')[1] + '월';
                    return (
                      <div
                        key={item.month}
                        className="flex flex-1 flex-col items-center justify-end gap-1"
                      >
                        <span className="text-xs font-medium text-gray-600">{item.count}건</span>
                        <div
                          className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-indigo-500 to-indigo-400"
                          style={{ height: `${barHeight}px` }}
                        />
                        <span className="text-xs text-gray-500">{monthLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity History (Grouped by Training Period) */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-600" />
                    <h4 className="font-semibold text-gray-800">활동 내역</h4>
                  </div>
                  <span className="text-xs text-gray-400">
                    {getRangeLabel()} ({stats.recentActivities.length}개 교육)
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {stats.recentActivities.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">활동 내역이 없습니다.</p>
                  ) : (
                    stats.recentActivities.map((activity) => (
                      <ActivityGroupItem
                        key={activity.trainingPeriodId}
                        activity={activity}
                        isExpanded={expandedIds.has(activity.trainingPeriodId)}
                        onToggle={() => toggleExpanded(activity.trainingPeriodId)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
