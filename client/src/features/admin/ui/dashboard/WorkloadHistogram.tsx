import React from 'react';
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
import { InstructorAnalysis, PeriodFilter } from '../../dashboardApi';

interface Props {
  instructors: InstructorAnalysis[];
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  onBarClick: (count: number, instructors: InstructorAnalysis[]) => void;
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '1m', label: '이번달' },
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '12m', label: '12개월' },
];

interface DistributionItem {
  name: string;
  count: number;
  value: number;
  instructorList: InstructorAnalysis[];
}

export const WorkloadHistogram: React.FC<Props> = ({
  instructors,
  period,
  onPeriodChange,
  onBarClick,
}) => {
  // Build distribution 0-12+
  const distribution: DistributionItem[] = [];

  for (let i = 0; i <= 12; i++) {
    const matching = instructors.filter((inst) => inst.completedCount === i);
    distribution.push({
      name: i.toString(),
      count: matching.length,
      value: i,
      instructorList: matching,
    });
  }
  // 12+
  const above12 = instructors.filter((inst) => inst.completedCount > 12);
  distribution.push({
    name: '12+',
    count: above12.length,
    value: 13,
    instructorList: above12,
  });

  const handleBarClick = (_: unknown, index: number) => {
    const item = distribution[index];
    if (item) {
      onBarClick(item.value, item.instructorList);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">강사 업무량 분포</h3>
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
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
            <YAxis axisLine={false} tickLine={false} fontSize={12} />
            <Tooltip
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value) => [`${value ?? 0}명`, '강사 수']}
              labelFormatter={(label) => `${label}회 완료`}
            />
            <Bar
              dataKey="count"
              fill="#6366F1"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={handleBarClick}
            >
              {distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#6366F1' : '#E5E7EB'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">막대 클릭 시 해당 강사 목록 조회</p>
    </div>
  );
};
