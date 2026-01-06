import React, { useEffect, useState } from 'react';
import {
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/shared/apiClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  instructorId: number;
  instructorName: string;
}

interface DashboardStats {
  summary: {
    totalWorkHours: number;
    totalDistance: number;
    totalWorkDays: number;
    yearCount: number;
    monthCount: number;
  };
  performance: {
    acceptanceRate: number;
    totalProposals: number;
    acceptedCount: number;
  };
  monthlyTrend: { month: string; count: number; hours: number }[];
  recentAssignments: {
    id: number;
    date: string;
    unitName: string;
    unitType: string | null;
    region: string | null;
    status: string;
    distance: number;
    workHours: number;
  }[];
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
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

  // Filter states
  const [rangeType, setRangeType] = useState<string>('12m'); // Default 12m
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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
    // custom: keep existing values
  }, [rangeType]);

  useEffect(() => {
    if (!isOpen || !instructorId) return;

    // If custom and dates are missing, don't fetch yet
    if (rangeType === 'custom' && (!startDate || !endDate)) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (rangeType === 'custom') {
          query.append('startDate', startDate);
          query.append('endDate', endDate);
        } else {
          query.append('period', rangeType);
          // For standard periods, rely on backend calculation to avoid stale state issues
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
                    </div>
                    <div className="rounded-full bg-white/60 p-3">
                      <MapPinIcon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
                <div className={`rounded-xl border p-5 ${colorStyles.purple}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-80">배정 수락률</p>
                      <p className="mt-1 text-2xl font-bold">{stats.performance.acceptanceRate}%</p>
                      <p className="text-xs opacity-70">
                        {stats.performance.acceptedCount}/{stats.performance.totalProposals}건
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
                      <p className="text-xs opacity-70">
                        {rangeType === 'custom' || rangeType === '1m'
                          ? '선택 기간'
                          : `최근 ${rangeType.replace('m', '')}개월`}{' '}
                        {stats.summary.yearCount}건
                      </p>
                    </div>
                    <div className="rounded-full bg-white/60 p-3">
                      <CheckCircleIcon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Trend Chart */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h4 className="font-semibold text-gray-800 mb-4">월별 활동 추이</h4>
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

              {/* Recent Assignments */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h4 className="font-semibold text-gray-800 mb-4">
                  활동 내역 ({stats.recentAssignments.length}건)
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {stats.recentAssignments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">활동 내역이 없습니다.</p>
                  ) : (
                    stats.recentAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{a.unitName}</p>
                          <p className="text-xs text-gray-500">
                            {a.date} {a.region && `• ${a.region}`}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-600">{a.workHours}시간</p>
                          <p className="text-xs text-gray-400">{a.distance}km</p>
                        </div>
                      </div>
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
