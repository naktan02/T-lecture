import React from 'react';
import { TeamDetail } from '../../dashboardApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teamDetail: TeamDetail | null;
  loading: boolean;
  onMemberClick: (member: { id: number; name: string }) => void;
}

export const TeamDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  teamDetail,
  loading,
  onMemberClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{teamDetail?.teamName || '팀'} 상세</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : !teamDetail ? (
            <p className="text-center text-gray-500 py-8">데이터를 불러올 수 없습니다.</p>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{teamDetail.memberCount}</p>
                  <p className="text-sm text-gray-500">팀원 수</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-indigo-600">{teamDetail.totalCompleted}</p>
                  <p className="text-sm text-gray-500">총 교육수</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-900">{teamDetail.averageCompleted}</p>
                  <p className="text-sm text-gray-500">인당 평균</p>
                </div>
              </div>

              {/* Member Table */}
              <h4 className="text-sm font-semibold text-gray-700 mb-2">팀원 목록</h4>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      이름
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      직책
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      교육 진행수
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamDetail.members.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onMemberClick(member)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{member.role || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 font-semibold">
                        {member.completedCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
