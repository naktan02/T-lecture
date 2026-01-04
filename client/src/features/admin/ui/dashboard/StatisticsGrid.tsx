import React from 'react';
import { DashboardStats } from '../../dashboardApi';

interface Props {
  stats: DashboardStats;
}

export const StatisticsGrid: React.FC<Props> = ({ stats }) => {
  const { educationStatus } = stats;
  const total =
    educationStatus.completed +
    educationStatus.inProgress +
    educationStatus.scheduled +
    educationStatus.unassigned;

  // Calculate completion rate
  const completionRate = total > 0 ? Math.round((educationStatus.completed / total) * 100) : 0;

  const items = [
    { label: '총 교육 일정', value: total, unit: '건', color: 'text-gray-900' },
    { label: '완료된 교육', value: educationStatus.completed, unit: '건', color: 'text-blue-600' },
    { label: '진행 중', value: educationStatus.inProgress, unit: '건', color: 'text-green-600' },
    {
      label: '미배정 (주의)',
      value: educationStatus.unassigned,
      unit: '건',
      color: 'text-red-500',
    },
    // Optional: Add more derived stats if needed
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <p className="text-sm font-medium text-gray-500 mb-1">{item.label}</p>
          <div className="flex items-baseline">
            <span className={`text-3xl font-bold ${item.color}`}>{item.value}</span>
            <span className="ml-1 text-sm text-gray-400">{item.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
