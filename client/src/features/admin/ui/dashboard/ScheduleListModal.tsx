import React from 'react';
import { ScheduleListItem } from '../../dashboardApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  schedules: ScheduleListItem[];
  loading: boolean;
}

export const ScheduleListModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  schedules,
  loading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
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
          ) : schedules.length === 0 ? (
            <p className="text-center text-gray-500 py-12">데이터가 없습니다.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                    부대명
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                    교육일
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                    강사
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{schedule.unitName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{schedule.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {schedule.instructorNames.join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
