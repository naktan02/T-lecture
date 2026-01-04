import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardStats, ScheduleStatus } from '../../dashboardApi';

interface Props {
  stats: DashboardStats;
  onSegmentClick: (status: ScheduleStatus) => void;
}

const COLORS = ['#10B981', '#3B82F6', '#6366F1', '#EF4444'];
const STATUS_LABELS: Record<string, string> = {
  inProgress: '진행 중',
  completed: '완료됨',
  scheduled: '예정됨',
  unassigned: '미배정',
};

export const EducationStatusChart: React.FC<Props> = ({ stats, onSegmentClick }) => {
  const { educationStatus } = stats;

  const data = [
    { name: '진행 중', value: educationStatus.inProgress, status: 'inProgress' as ScheduleStatus },
    { name: '완료됨', value: educationStatus.completed, status: 'completed' as ScheduleStatus },
    { name: '예정됨', value: educationStatus.scheduled, status: 'scheduled' as ScheduleStatus },
    { name: '미배정', value: educationStatus.unassigned, status: 'unassigned' as ScheduleStatus },
  ];

  const handleClick = (entry: any) => {
    if (entry && entry.status) {
      onSegmentClick(entry.status);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">교육 진행 현황</h3>
      <div className="w-full h-72 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={3}
              dataKey="value"
              onClick={(_, index) => handleClick(data[index])}
              style={{ cursor: 'pointer' }}
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
              formatter={(value, name) => [`${value ?? 0}건`, name]}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center -mt-8">
            <p className="text-3xl font-bold text-gray-900">{educationStatus.total}</p>
            <p className="text-sm text-gray-500">총 교육</p>
          </div>
        </div>
      </div>
    </div>
  );
};
