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
import { TeamAnalysis, PeriodFilter } from '../../dashboardApi';

interface Props {
  teams: TeamAnalysis[];
  onBarClick: (team: TeamAnalysis) => void;
}

const COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#A78BFA',
  '#C4B5FD',
  '#DDD6FE',
  '#10B981',
  '#3B82F6',
  '#F59E0B',
];

export const TeamWorkloadChart: React.FC<Props> = ({ teams, onBarClick }) => {
  const data = teams
    .map((team) => ({
      ...team,
      value: team.completedCount,
    }))
    .sort((a, b) => b.value - a.value);

  const handleBarClick = (_: unknown, index: number) => {
    if (data[index]) {
      onBarClick(data[index]);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">팀 업무량 분포</h3>
      </div>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} fontSize={11} />
            <YAxis
              type="category"
              dataKey="teamName"
              axisLine={false}
              tickLine={false}
              fontSize={11}
              width={60}
              tick={{ style: { whiteSpace: 'nowrap' } }}
            />
            <Tooltip
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value) => [`${value ?? 0}건`, '총 교육수']}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={handleBarClick}
              barSize={10}
            >
              {data.map((_, index) => (
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
