import React from 'react';
import { InstructorAnalysis } from '../../dashboardApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  instructors: InstructorAnalysis[];
  onInstructorClick: (instructor: InstructorAnalysis) => void;
}

export const InstructorListModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  instructors,
  onInstructorClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {instructors.length === 0 ? (
            <p className="text-center text-gray-500 py-8">해당 조건의 강사가 없습니다.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    이름
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    팀
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    교육 진행수
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instructors.map((inst) => (
                  <tr
                    key={inst.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onInstructorClick(inst)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{inst.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{inst.team || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 font-semibold">
                      {inst.completedCount}
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
