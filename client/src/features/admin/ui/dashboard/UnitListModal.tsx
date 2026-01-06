import React from 'react';
import { UnitListItem } from '../../dashboardApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  units: UnitListItem[];
  loading: boolean;
  onUnitClick: (unit: UnitListItem) => void;
}

export const UnitListModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  units,
  loading,
  onUnitClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
              title="닫기"
            >
              ←
            </button>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : units.length === 0 ? (
            <p className="text-center text-gray-500 py-12">데이터가 없습니다.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                    부대명
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                    일정 수
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                    강사 수
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                    교육 기간
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {units.map((unit) => (
                  <tr
                    key={unit.id}
                    className="hover:bg-indigo-50 cursor-pointer transition-colors"
                    onClick={() => onUnitClick(unit)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{unit.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{unit.scheduleCount}건</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{unit.instructorCount}명</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{unit.dateRange}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t bg-gray-50 px-5 py-3 text-sm text-gray-500">
          총 {units.length}개 부대
        </div>
      </div>
    </div>
  );
};
