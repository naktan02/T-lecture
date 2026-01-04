import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardStats } from '../../dashboardApi';

interface Props {
  stats: DashboardStats;
}

const COLORS = ['#10B981', '#3B82F6', '#6366F1', '#EF4444']; // Green, Blue, Indigo, Red

export const EducationStatusChart: React.FC<Props> = ({ stats }) => {
  const data = [
    { name: '진행 중', value: stats.educationStatus.inProgress },
    { name: '완료됨', value: stats.educationStatus.completed },
    { name: '예정됨', value: stats.educationStatus.scheduled },
    { name: '미배정', value: stats.educationStatus.unassigned },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-96">
      <h3 className="text-lg font-bold text-gray-800 mb-4">교육 진행 현황</h3>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
