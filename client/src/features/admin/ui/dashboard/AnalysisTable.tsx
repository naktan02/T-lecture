import React, { useState } from 'react';
import { InstructorAnalysis, TeamAnalysis } from '../../dashboardApi';

interface Props {
  instructors: InstructorAnalysis[];
  teams: TeamAnalysis[];
  onInstructorClick: (instructor: InstructorAnalysis) => void;
  onTeamClick: (team: TeamAnalysis) => void;
}

type Tab = 'INSTRUCTOR' | 'TEAM';
type SortField = string;
type SortDirection = 'asc' | 'desc';

export const AnalysisTable: React.FC<Props> = ({
  instructors,
  teams,
  onInstructorClick,
  onTeamClick,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('INSTRUCTOR');
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Filter & Sort Instructors
  const filteredInstructors = instructors
    .filter(
      (i) =>
        i.name.toLowerCase().includes(filter.toLowerCase()) ||
        i.team?.toLowerCase().includes(filter.toLowerCase()),
    )
    .sort((a, b) => {
      if (!sortField) return 0;
      let diff = 0;

      if (sortField === 'name') {
        diff = a.name.localeCompare(b.name);
      } else if (sortField === 'role') {
        diff = (a.role || '').localeCompare(b.role || '');
      } else if (sortField === 'team') {
        diff = (a.team || '').localeCompare(b.team || '');
      } else if (sortField === 'completedCount') {
        diff = a.completedCount - b.completedCount;
      } else if (sortField === 'acceptanceRate') {
        diff = a.acceptanceRate - b.acceptanceRate;
      } else if (sortField === 'isActive') {
        diff = Number(a.isActive) - Number(b.isActive);
      }

      return sortDirection === 'asc' ? diff : -diff;
    });

  // Filter & Sort Teams
  const filteredTeams = teams
    .filter((t) => t.teamName.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (!sortField) return 0;
      let diff = 0;

      if (sortField === 'teamName') {
        diff = a.teamName.localeCompare(b.teamName);
      } else if (sortField === 'memberCount') {
        diff = a.memberCount - b.memberCount;
      } else if (sortField === 'completedCount') {
        diff = a.completedCount - b.completedCount;
      } else if (sortField === 'averageCompleted') {
        diff = a.averageCompleted - b.averageCompleted;
      } else if (sortField === 'activeMemberRate') {
        diff = a.activeMemberRate - b.activeMemberRate;
      }

      return sortDirection === 'asc' ? diff : -diff;
    });

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col"
      style={{ maxHeight: 'calc(100vh - 600px)', minHeight: '300px' }}
    >
      <div className="p-3 md:p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-shrink-0">
        <div className="flex space-x-2 md:space-x-4 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveTab('INSTRUCTOR');
              setSortField('');
            }}
            className={`flex-1 sm:flex-none px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
              activeTab === 'INSTRUCTOR'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            강사 현황
          </button>
          <button
            onClick={() => {
              setActiveTab('TEAM');
              setSortField('');
            }}
            className={`flex-1 sm:flex-none px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
              activeTab === 'TEAM'
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            팀 현황
          </button>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="검색..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-40"
          />
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            {activeTab === 'INSTRUCTOR' ? (
              <tr>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('name')}
                >
                  이름 {getSortIcon('name')}
                </th>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('role')}
                >
                  직책 {getSortIcon('role')}
                </th>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('team')}
                >
                  팀 {getSortIcon('team')}
                </th>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-right text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('completedCount')}
                >
                  교육 진행수 {getSortIcon('completedCount')}
                </th>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-right text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('acceptanceRate')}
                >
                  수락률 {getSortIcon('acceptanceRate')}
                </th>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-center text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('isActive')}
                >
                  활동 여부 {getSortIcon('isActive')}
                </th>
              </tr>
            ) : (
              <tr>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('teamName')}
                >
                  팀명 {getSortIcon('teamName')}
                </th>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-right text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('memberCount')}
                >
                  팀원 수 {getSortIcon('memberCount')}
                </th>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-right text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('completedCount')}
                >
                  교육 진행수 {getSortIcon('completedCount')}
                </th>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-right text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('averageCompleted')}
                >
                  인당 평균 {getSortIcon('averageCompleted')}
                </th>
                <th
                  className="px-3 py-3 md:px-6 md:py-3 text-right text-[10px] md:text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                  onClick={() => handleSort('activeMemberRate')}
                >
                  가동률 {getSortIcon('activeMemberRate')}
                </th>
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activeTab === 'INSTRUCTOR' ? (
              filteredInstructors.length > 0 ? (
                filteredInstructors.map((inst) => (
                  <tr
                    key={inst.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onInstructorClick(inst)}
                  >
                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm font-medium text-gray-900">
                      {inst.name}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm text-gray-500">
                      {inst.role || '-'}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm text-gray-500">
                      {inst.team || '-'}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm text-right text-gray-900 font-semibold">
                      {inst.completedCount}
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm text-right text-gray-500">
                      {inst.acceptanceRate}%
                    </td>
                    <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 inline-flex text-[10px] md:text-xs leading-5 font-semibold rounded-full ${
                          inst.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {inst.isActive ? '활동' : '미활동'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-3 md:px-6 md:py-4 text-center text-xs md:text-sm text-gray-500"
                  >
                    데이터가 없습니다.
                  </td>
                </tr>
              )
            ) : filteredTeams.length > 0 ? (
              filteredTeams.map((team) => (
                <tr
                  key={team.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onTeamClick(team)}
                >
                  <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm font-medium text-gray-900">
                    {team.teamName}
                  </td>
                  <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm text-right text-gray-500">
                    {team.memberCount}
                  </td>
                  <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm text-right text-gray-900 font-semibold">
                    {team.completedCount}
                  </td>
                  <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm text-right text-gray-500">
                    {team.averageCompleted}
                  </td>
                  <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-[11px] md:text-sm text-right text-gray-500">
                    {team.activeMemberRate}%
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-3 md:px-6 md:py-4 text-center text-xs md:text-sm text-gray-500"
                >
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
