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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
              title="뒤로가기"
            >
              ←
            </button>
            <h3 className="text-xl font-bold text-gray-900">{teamDetail?.teamName || '팀'} 상세</h3>
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
          ) : !teamDetail ? (
            <p className="text-center text-gray-500 py-12">데이터를 불러올 수 없습니다.</p>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-3xl font-bold text-gray-900">{teamDetail.memberCount}</p>
                  <p className="text-sm text-gray-500 mt-1">팀원 수</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-3xl font-bold text-indigo-600">{teamDetail.totalCompleted}</p>
                  <p className="text-sm text-gray-500 mt-1">총 교육수</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-3xl font-bold text-gray-900">{teamDetail.averageCompleted}</p>
                  <p className="text-sm text-gray-500 mt-1">인당 평균</p>
                </div>
              </div>

              {/* Member Table */}
              <h4 className="text-base font-semibold text-gray-700 mb-3">팀원 목록</h4>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                      이름
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                      직책
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase">
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
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{member.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{member.role || '-'}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 font-semibold">
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
