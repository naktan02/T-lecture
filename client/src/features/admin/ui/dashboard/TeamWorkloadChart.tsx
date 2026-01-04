import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TeamAnalysis, PeriodFilter } from '../../dashboardApi';

interface Props {
  teams: TeamAnalysis[];
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  onBarClick: (team: TeamAnalysis) => void;
}

type ViewMode = 'total' | 'average';

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '1m', label: '이번달' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '12m', label: '12개월' },
];

const COLORS = ['#6366F1', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'];

export const TeamWorkloadChart: React.FC<Props> = ({
  teams,
  period,
  onPeriodChange,
  onBarClick,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('total');

  const data = teams.map((team) => ({
    ...team,
    value: viewMode === 'total' ? team.completedCount : team.averageCompleted,
  }));

  // Sort by value descending
  data.sort((a, b) => b.value - a.value);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload as TeamAnalysis;
      onBarClick(payload);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">팀 업무량 분포</h3>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('total')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'total'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              총 교육수
            </button>
            <button
              onClick={() => setViewMode('average')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'average'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              인당 평균
            </button>
          </div>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as PeriodFilter)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            onClick={handleBarClick}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} fontSize={12} />
            <YAxis
              type="category"
              dataKey="teamName"
              axisLine={false}
              tickLine={false}
              fontSize={12}
              width={55}
            />
            <Tooltip
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value) => [
                viewMode === 'total' ? `${value ?? 0}건` : `${value ?? 0}건/인`,
                viewMode === 'total' ? '총 교육수' : '인당 평균',
              ]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">막대 클릭 시 팀 상세 조회</p>
    </div>
  );
};
