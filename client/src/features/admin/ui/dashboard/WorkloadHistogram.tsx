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
import { InstructorAnalysis } from '../../dashboardApi';

interface Props {
  instructors: InstructorAnalysis[];
  onBarClick: (label: string, instructors: InstructorAnalysis[]) => void;
  // added rangeType for dynamic scaling
  rangeType: string;
}

interface DistributionItem {
  name: string;
  count: number;
  value: number; // Represents the start of range or exact value
  instructorList: InstructorAnalysis[];
  isRange?: boolean;
}

// Determines the max scale based on range type
const getMaxCount = (rangeType: string): number => {
  switch (rangeType) {
    case '1m':
      return 12; // 0-12+
    case '3m':
      return 36; // 0-36+
    case '6m':
      return 72;
    case '12m':
      return 144;
    case 'custom':
      return 100; // heuristic
    default:
      return 12;
  }
};

export const WorkloadHistogram: React.FC<Props> = ({ instructors, onBarClick, rangeType }) => {
  const maxCount = getMaxCount(rangeType);
  const distribution: DistributionItem[] = [];

  // Decide bin size to keep total bars around 12-15
  // If maxCount <= 15, binSize = 1
  // If maxCount > 15, binSize = ceil(maxCount / 12)
  const binCount = 12;
  const binSize = maxCount <= 15 ? 1 : Math.ceil(maxCount / binCount);

  // Generate bins
  // If binSize=1: 0, 1, 2 ... maxCount, (maxCount+1)+
  // If binSize=3: 0-2, 3-5 ...
  for (let i = 0; i < binCount; i++) {
    const start = i * binSize;
    const end = start + binSize - 1;

    // Filter logic
    const matching = instructors.filter((inst) => {
      if (binSize === 1) return inst.completedCount === start;
      return inst.completedCount >= start && inst.completedCount <= end;
    });

    let label = '';
    if (binSize === 1) {
      label = start.toString();
    } else {
      label = `~${end}`;
    }

    distribution.push({
      name: label,
      count: matching.length,
      value: start, // Pass the start value for callback logic?
      // Wait, callback usually filters EXACT value if binSize=1.
      // If binSize > 1, we pass the whole list.
      instructorList: matching,
      isRange: binSize > 1,
    });
  }

  // Last bucket: "Above Max"
  // The loop goes up to binCount * binSize - 1.
  // Next value starts at binCount * binSize.
  const threshold = binCount * binSize;
  const aboveThreshold = instructors.filter((inst) => inst.completedCount >= threshold);

  distribution.push({
    name: `${threshold}+`,
    count: aboveThreshold.length,
    value: threshold,
    instructorList: aboveThreshold,
    isRange: true,
  });

  const handleBarClick = (_: unknown, index: number) => {
    const item = distribution[index];
    if (item) {
      onBarClick(item.name, item.instructorList);
    }
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm md:text-lg font-bold text-gray-800">강사 업무량 분포</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {rangeType === 'custom' ? '선택 기간' : `최근 ${rangeType}`} 기준
        </span>
      </div>
      <div className="w-full h-60 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} interval={0} />
            <YAxis axisLine={false} tickLine={false} fontSize={10} />
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
              barSize={20} // Slightly wider for ranges
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
