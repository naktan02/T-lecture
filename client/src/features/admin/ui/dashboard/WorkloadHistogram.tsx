import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { InstructorAnalysis } from '../../dashboardApi';

interface Props {
  instructors: InstructorAnalysis[];
}

export const WorkloadHistogram: React.FC<Props> = ({ instructors }) => {
  // Calculate histogram
  const distribution = [
    { name: '0회', count: 0, range: '0' },
    { name: '1~2회', count: 0, range: '1-2' },
    { name: '3~5회', count: 0, range: '3-5' },
    { name: '6회+', count: 0, range: '6+' },
  ];

  instructors.forEach((inst) => {
    const count = inst.acceptedCount;
    if (count === 0) distribution[0].count++;
    else if (count <= 2) distribution[1].count++;
    else if (count <= 5) distribution[2].count++;
    else distribution[3].count++;
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-96">
      <h3 className="text-lg font-bold text-gray-800 mb-4">강사 업무량 분포</h3>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: '#F3F4F6' }}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="count" name="강사 수" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
